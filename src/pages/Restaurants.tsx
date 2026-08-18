import React, { useEffect, useState } from "react";
import { Store, Plus, X, Trash2, Edit3 } from "lucide-react";
import api, { API_ORIGIN } from "../services/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import EnglishFieldWithTranslate from "../components/EnglishFieldWithTranslate";

interface Restaurant {
  id: number;
  name: string;
  name_en?: string | null;
  address: string;
  address_en?: string | null;
  phone: string;
  image_url: string;
  categories?: string;
  category_ids?: string;
  type_id?: number;
  created_at: string;
  latitude?: number;
  longitude?: number;
  schedule?: ScheduleItem[];
  branch_id?: number;
  branch_name?: string;
  agent_id?: number;
  agent_name?: string;
display_type?: string;
  is_active?: number;
  delivery_time?: string;
}

interface Category {
  id: number;
  name: string;
}

interface TypeItem {
  id: number;
  name: string;
}

interface Branch {
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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminGeneral = user?.is_admin_branch === true;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<TypeItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
 const [deliveryTime, setDeliveryTime] = useState("");
const [isActive, setIsActive] = useState(true);
const [deliveryFrom, setDeliveryFrom] = useState("");
const [deliveryTo, setDeliveryTo] = useState("");
const [imageUrl, setImageUrl] = useState("");
const [uploadingImage, setUploadingImage] = useState(false);
const [displayType, setDisplayType] = useState("product"); // "product" أو "manual"
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<number | "">("");
  const [selectedBranch, setSelectedBranch] = useState<number | "">("");


  const [storeSchedule, setStoreSchedule] = useState<ScheduleItem[]>(
    daysOfWeek.map((day) => ({ day, start: "", end: "", closed: false }))
  );

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
 const [mapUrl, setMapUrl] = useState("");

  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    name_en: "",
    address: "",
    address_en: "",
    phone: "",
    image_url: "",
  });

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [searchText, setSearchText] = useState("");

  const [activeBranch, setActiveBranch] = useState<string | null>(
    localStorage.getItem("branch_id")
  );

  useEffect(() => {
    const onStorage = () => setActiveBranch(localStorage.getItem("branch_id"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

  const fetchTypes = async () => {
    const res = await api.get(`/types`);
    const data = res.data;
    setTypes(data.types || []);
  };

  const fetchBranches = async () => {
    if (!isAdminGeneral) return;
    const res = await api.get(`/branches`);
    setBranches(res.data.branches || []);
  };

  useEffect(() => {
    fetchRestaurants();
  }, [activeBranch]);

  useEffect(() => {
    fetchCategories();
    fetchTypes();
    fetchBranches();
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    e.target.value = "";
    if (!img) return;

    if (!img.type.startsWith("image/")) {
      alert("اختر ملف صورة فقط");
      return;
    }

    const localPreview = URL.createObjectURL(img);
    setFile(img);
    setPreview(localPreview);
    setUploadingImage(true);

    try {
      const body = new FormData();
      body.append("image", img);
      body.append("folder", "restaurants");

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
        setFile(null);
        setPreview(null);
        return;
      }

      setImageUrl(url);
      setPreview(url);
      setFile(null);
    } catch {
      alert("خطأ في رفع الصورة");
      setFile(null);
      setPreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (uploadingImage) {
    alert("انتظر حتى ينتهي رفع الصورة");
    return;
  }

  const data = new FormData();

  data.append("name", formData.name);
  data.append("name_en", formData.name_en || "");
  data.append("address", formData.address);
  data.append("address_en", formData.address_en || "");
  data.append("phone", formData.phone);
  data.append("type_id", String(selectedType));
  data.append("display_type", displayType);
  data.append("category_ids", JSON.stringify(selectedCategories));
  data.append("schedule", JSON.stringify(storeSchedule));

  const deliveryValue =
    deliveryFrom && deliveryTo ? `${deliveryFrom}-${deliveryTo}` : "";

  data.append("delivery_time", deliveryValue);
  data.append("is_active", isActive ? "1" : "0");

  if (mapUrl) data.append("map_url", mapUrl);

  if (selectedAgent) {
    data.append("agent_id", String(selectedAgent));
  }

  if (imageUrl) {
    data.append("image_url", imageUrl);
  }
  if (file) {
    data.append("image", file);
  }

  const headers =
    isAdminGeneral && selectedBranch ? { "x-branch-id": selectedBranch } : {};

  try {
    if (editMode) {
      await api.put(`/restaurants/${formData.id}`, data, { headers });
      alert("✅ تم تعديل المطعم");
    } else {
      await api.post(`/restaurants`, data, { headers });
      alert("✅ تم إضافة المطعم");
    }

    resetForm();
    fetchRestaurants();
  } catch (err: any) {
    alert(err?.response?.data?.message || "❌ فشل حفظ المطعم");
  }
};





const handleEdit = (r: Restaurant) => {
  setFormData({
    id: r.id,
    name: r.name,
    name_en: r.name_en || "",
    address: r.address,
    address_en: r.address_en || "",
    phone: r.phone,
    image_url: r.image_url || "",
  });

    // ✅ مهم جدًا
  setMapUrl(r.map_url || "");
  setLatitude(r.latitude || "");
  setLongitude(r.longitude || "");
  
    setImageUrl(r.image_url || ""); 
       setDisplayType(r.display_type || "product"); // تعبئة القيمة عند التعديل
  const categoryIds = r.category_ids
    ? String(r.category_ids).split(",").map((id) => Number(id))
    : [];

  setSelectedCategories(categoryIds);
  setSelectedType(r.type_id || "");
  setSelectedBranch(r.branch_id || "");
  setPreview(r.image_url || null);
  setSelectedAgent(r.agent_id || "");
  setFile(null);

  setIsActive(Boolean(r.is_active));

  if (r.delivery_time) {
    const [from, to] = String(r.delivery_time).split("-");
    setDeliveryFrom(from || "");
    setDeliveryTo(to || "");
    setDeliveryTime(r.delivery_time);
  } else {
    setDeliveryFrom("");
    setDeliveryTo("");
    setDeliveryTime("");
  }

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

  const resetForm = () => {
  setFormData({ id: 0, name: "", name_en: "", address: "", address_en: "", phone: "", image_url: "" });
  setSelectedCategories([]);
  setSelectedType("");
  setSelectedBranch("");
  setSelectedAgent("");
setDisplayType("product"); // إعادة القيمة الافتراضية
  setDeliveryFrom("");
  setDeliveryTo("");
  setDeliveryTime("");
  setIsActive(true);

  setLatitude("");
  setLongitude("");
  setStoreSchedule(
    daysOfWeek.map((day) => ({ day, start: "", end: "", closed: false }))
  );

  setFile(null);
  setPreview(null);
  setImageUrl("");
  setMapUrl("");
  setEditMode(false);
  setShowModal(false);
};



const filteredRestaurants = restaurants.filter((r) => {
  const q = searchText.toLowerCase();
  return (
    r.name.toLowerCase().includes(q) ||
    (r.branch_name || "").toLowerCase().includes(q)
  );
});



   const [agents, setAgents] = useState<any[]>([]);
const [selectedAgent, setSelectedAgent] = useState<number | "">("");

useEffect(() => {
  api.get("/agents").then((res) => {
    const list = Array.isArray(res.data?.agents) ? res.data.agents : [];
    setAgents(list);
  });
}, []);

  function extractLatLng(url) {
  const match = url.match(/@([-0-9.]+),([-0-9.]+)/);
  if (match) {
    return {
      lat: match[1],
      lng: match[2]
    };
  }

  const qMatch = url.match(/q=([-0-9.]+),([-0-9.]+)/);
  if (qMatch) {
    return {
      lat: qMatch[1],
      lng: qMatch[2]
    };
  }

  return null;
}

  
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

   <input
  type="text"
  placeholder="بحث باسم المطعم أو الفرع..."
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  className="border rounded-lg px-3 py-2 w-full max-w-md"
/>


     <div className="bg-white rounded-xl shadow-lg overflow-hidden">
  {loading ? (
    <div className="p-6 text-center">⏳ جاري التحميل...</div>
  ) : (
    <DragDropContext
      onDragEnd={(result) => {
        if (!result.destination) return;

        const items = Array.from(filteredRestaurants);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);

        setRestaurants((prev) => {
          const ids = new Set(items.map((x) => x.id));
          const rest = prev.filter((x) => !ids.has(x.id));
          return [...items, ...rest];
        });

        api.post("/restaurants/reorder", {
          order: items.map((r, i) => ({ id: r.id, sort_order: i + 1 })),
        });
      }}
    >
      <table className="w-full text-center">
        <thead className="bg-gray-50">
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الفرع</th>
            <th>العنوان</th>
            <th>الهاتف</th>
            <th>الفئات</th>
            <th>الوكيل</th>
            <th>الحالة</th>
            <th>الصورة</th>
            <th>الخريطة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <Droppable droppableId="restaurants">
          {(provided) => (
            <tbody ref={provided.innerRef} {...provided.droppableProps}>
              {filteredRestaurants.map((r, index) => (
                <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                  {(prov) => (
                    <tr
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="flex items-center gap-2 justify-center">
                        <span>#{index + 1}</span>
                        <span
                          {...prov.dragHandleProps}
                          className="cursor-move text-gray-400 hover:text-gray-700"
                        >
                          <GripVertical size={16} />
                        </span>
                      </td>

                      <td>{r.name}</td>
                      <td>{r.branch_name || "-"}</td>
                      <td>{r.address}</td>
                      <td>{r.phone}</td>
                      <td>{r.categories || "-"}</td>
                      <td>{r.agent_name || "-"}</td>

                      <td>
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            r.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.is_active ? "مفعل" : "غير مفعل"}
                        </span>
                      </td>

               <td>


  {r.image_url && (
    <img
      src={r.image_url}
        alt={r.name}
      className="w-16 h-16 object-cover rounded"
    />
  )}
</td>


                      <td>
                        {r.map_url ? (
                          <a
                            href={r.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            GPS
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="flex gap-2 justify-center">
                        <button onClick={() => handleEdit(r)} className="text-blue-600">
                          <Edit3 />
                        </button>
                        <button className="text-red-600">
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          )}
        </Droppable>
      </table>
    </DragDropContext>
  )}
</div>





  {/* الفرع + نوع المحل */}
{showModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

          {isAdminGeneral ? (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-full col-span-1"
            required
          >
      <option value="">اختر الفرع</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  ) : (
    <input
      type="text"
      value={user.branch_name || ""}
      disabled
      className="border rounded-lg px-3 py-2 w-full bg-gray-100 col-span-1"
    />
  )}

  <select
    value={selectedType}
    onChange={(e) => setSelectedType(Number(e.target.value))}
    required
    className="border rounded-lg px-3 py-2 w-full col-span-1"
  >
    <option value="">اختر نوع المحل</option>
    {types.map((t) => (
      <option key={t.id} value={t.id}>{t.name}</option>
    ))}
  </select>

  {/* الوكيل كامل العرض */}
  <select
    value={selectedAgent}
    onChange={(e) => setSelectedAgent(Number(e.target.value))}
    className="border rounded-lg px-3 py-2 w-full col-span-2"
    required
  >
    <option value="">اختر الوكيل</option>
    {agents.map((a) => (
      <option key={a.id} value={a.id}>{a.name}</option>
    ))}
  </select>

  {/* اسم المطعم */}
  <input
    type="text"
    placeholder="اسم المطعم (عربي)"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    required
    className="border rounded-lg px-3 py-2 w-full col-span-2"
  />

  <EnglishFieldWithTranslate
    arabicText={formData.name}
    value={formData.name_en}
    onChange={(value) => setFormData({ ...formData, name_en: value })}
    placeholder="Restaurant name (English)"
    className="col-span-2"
    inputClassName="border rounded-lg px-3 py-2 w-full"
  />

  {/* العنوان + الهاتف */}
  <input
    type="text"
    placeholder="العنوان (عربي)"
    value={formData.address}
    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
    className="border rounded-lg px-3 py-2 w-full col-span-1"
  />

  <EnglishFieldWithTranslate
    arabicText={formData.address}
    value={formData.address_en}
    onChange={(value) => setFormData({ ...formData, address_en: value })}
    placeholder="Address (English)"
    className="col-span-1"
    inputClassName="border rounded-lg px-3 py-2 w-full"
  />

  <input
    type="text"
    placeholder="الهاتف"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    className="border rounded-lg px-3 py-2 w-full col-span-1"
  />

{/* الفئات + نوع العرض */}
<div className="grid grid-cols-2 gap-3 col-span-2">
  
  {/* مربع الفئات */}
  <div className="border p-3 rounded-lg max-h-32 overflow-y-auto">
    <h3 className="font-semibold mb-2">الفئات</h3>
    {categories.map((c) => (
      <label key={c.id} className="flex items-center gap-2 mb-1">
        <input
          type="checkbox"
          checked={selectedCategories.includes(c.id)}
          onChange={() => toggleCategory(c.id)}
        />
        {c.name}
      </label>
    ))}
  </div>

  {/* مربع نوع العرض */}
  <div className="border p-3 rounded-lg">
    <h3 className="font-semibold mb-2 text-blue-700">🛒 نوع العرض (طريقة الشراء)</h3>
    <select
      value={displayType}
      onChange={(e) => setDisplayType(e.target.value)}
      className="border rounded-lg px-3 py-2 w-full bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none"
      required
    >
      <option value="product">شراء من قائمة المنتجات (أتمتة)</option>
      <option value="manual">شراء يدوي (إضافة العميل يدوياً)</option>
    </select>
    <p className="text-[11px] text-gray-500 mt-2 italic">
      * شراء يدوي: يستخدم للمحلات التي ليس لها قائمة أسعار ثابتة.
    </p>
  </div>

</div>

  {/* جدول التوقيت */}
  <div className="border p-3 rounded-lg col-span-2">
    <h3 className="font-semibold mb-2">🕐 جدول التوقيت</h3>
    {storeSchedule.map((dayItem, index) => (
      <div key={dayItem.day} className="flex items-center gap-2 mb-2">
        <label className="w-20">{dayItem.day}</label>
        {dayItem.closed ? (
          <span className="text-red-600 font-medium">مغلق</span>
        ) : (
          <>
            <input
              type="time"
              value={dayItem.start}
              onChange={(e) => {
                const copy = [...storeSchedule];
                copy[index].start = e.target.value;
                setStoreSchedule(copy);
              }}
              className="border px-2 py-1 rounded"
            />
            <span>-</span>
            <input
              type="time"
              value={dayItem.end}
              onChange={(e) => {
                const copy = [...storeSchedule];
                copy[index].end = e.target.value;
                setStoreSchedule(copy);
              }}
              className="border px-2 py-1 rounded"
            />
          </>
        )}
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={dayItem.closed}
            onChange={(e) => {
              const copy = [...storeSchedule];
              copy[index].closed = e.target.checked;
              if (e.target.checked) {
                copy[index].start = "";
                copy[index].end = "";
              }
              setStoreSchedule(copy);
            }}
          />
          مغلق
        </label>
      </div>
    ))}
  </div>

  {/* رابط الموقع + حالة المطعم */}
  <input
    type="text"
    placeholder="رابط الموقع من Google Maps"
    value={mapUrl}
   onChange={(e) => {
  const value = e.target.value;
  setMapUrl(value);

  const location = extractLatLng(value);

  if (location) {
    setLatitude(location.lat);
    setLongitude(location.lng);
  }
}}

    className="border rounded-lg px-3 py-2 w-full col-span-1"
  />

  <div className="border rounded-lg px-3 py-2 w-full flex items-center justify-between col-span-1">
    <span className="font-medium">حالة المطعم</span>
    <label className="flex items-center gap-2">
      <span className={isActive ? "text-green-600" : "text-red-600"}>
        {isActive ? "مفعل" : "غير مفعل"}
      </span>
      <input
        type="checkbox"
        checked={isActive}
        onChange={(e) => setIsActive(e.target.checked)}
        className="w-4 h-4"
      />
    </label>
  </div>
<div className="col-span-2 grid grid-cols-2 gap-3">
  <input
    type="text"
    placeholder="خط العرض (Latitude)"
    value={latitude}
    readOnly
    className="border rounded-lg px-3 py-2 w-full bg-gray-100"
  />

  <input
    type="text"
    placeholder="خط الطول (Longitude)"
    value={longitude}
    readOnly
    className="border rounded-lg px-3 py-2 w-full bg-gray-100"
  />
</div>

{/* مدة التوصيل */}
<div className="border p-3 rounded-lg col-span-2">
  <h3 className="font-semibold mb-2">مدة التوصيل (بالدقائق)</h3>
  <div className="flex gap-2">
    <input
      type="number"
      placeholder="من"
      value={deliveryFrom}
      onChange={(e) => setDeliveryFrom(e.target.value)}
      className="border rounded-lg px-3 py-2 w-full"
    />
    <input
      type="number"
      placeholder="إلى"
      value={deliveryTo}
      onChange={(e) => setDeliveryTo(e.target.value)}
      className="border rounded-lg px-3 py-2 w-full"
    />
  </div>
</div> {/* 👈 هذا الإغلاق كان ناقص */}

{/* الصورة */}
<div className="col-span-2 rounded border p-3 space-y-2">
  <label className="block font-bold text-sm text-gray-700">صورة المطعم</label>

  <label
    className={`block cursor-pointer rounded bg-gray-100 px-3 py-2 text-center hover:bg-gray-200 ${
      uploadingImage ? "opacity-60 pointer-events-none" : ""
    }`}
  >
    {uploadingImage ? "جاري رفع الصورة..." : "رفع صورة من الملفات"}
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploadingImage}
      onChange={handleImageChange}
    />
  </label>

  {(preview || imageUrl) && (
    <div className="flex items-center gap-3">
      <img
        src={preview || imageUrl}
        alt="معاينة"
        className="w-20 h-20 rounded object-cover border"
      />
      <button
        type="button"
        onClick={() => {
          setFile(null);
          setPreview(null);
          setImageUrl("");
        }}
        className="text-red-600 text-sm"
        disabled={uploadingImage}
      >
        إزالة
      </button>
    </div>
  )}
</div>



  {/* الأزرار */}
  <div className="flex gap-2 col-span-2">
    <button
      type="submit"
      disabled={uploadingImage}
      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
    >
      حفظ
    </button>
    <button type="button" onClick={resetForm} className="flex-1 bg-gray-400 text-white px-4 py-2 rounded">
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

export default Restaurants;
