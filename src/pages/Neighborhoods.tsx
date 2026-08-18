import React, { useEffect, useState } from "react";
import api from "../services/api";

type BoundaryPoint = {
  lat: string;
  lng: string;
};

interface Neighborhood {
  id: number;
  name: string;
  name_en?: string | null;
  delivery_fee: number;
  branch_id: number;
  branch_name?: string;
  boundary_points?: Array<{ lat: number; lng: number }>;
}

interface Branch {
  id: number;
  name: string;
  address?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_KEY = "AIzaSyD1Cg7YKXlWGMhVLjRKy0GmlL149_W08SQ";
const DEFAULT_MAP_CENTER = { lat: 15.369445, lng: 44.191006 };
const BRANCH_MAP_CENTERS: Record<string, { lat: number; lng: number }> = {
  "صنعاء": { lat: 15.369445, lng: 44.191006 },
  "عدن": { lat: 12.785497, lng: 45.018654 },
  "عتق": { lat: 14.53767, lng: 46.83187 },
  "شبوة": { lat: 14.53767, lng: 46.83187 },
  "المكلا": { lat: 14.54248, lng: 49.12424 },
  "سيئون": { lat: 15.94194, lng: 48.78708 },
  "تعز": { lat: 13.57952, lng: 44.02091 },
  "إب": { lat: 13.96667, lng: 44.18333 },
  "ذمار": { lat: 14.54274, lng: 44.40514 },
  "الحديدة": { lat: 14.79781, lng: 42.95452 },
};

const emptyBoundaryPoint = (): BoundaryPoint => ({ lat: "", lng: "" });

const getMapCenter = (primary?: string, secondary?: string) => {
  const normalizedPrimary = String(primary || "").trim();
  const normalizedSecondary = String(secondary || "").trim();
  const combined = `${normalizedPrimary} ${normalizedSecondary}`.trim();

  if (!combined) return DEFAULT_MAP_CENTER;

  const direct =
    BRANCH_MAP_CENTERS[normalizedPrimary] || BRANCH_MAP_CENTERS[combined];
  if (direct) return direct;

  const partialKey = Object.keys(BRANCH_MAP_CENTERS).find(
    (key) =>
      normalizedPrimary.includes(key) ||
      normalizedSecondary.includes(key) ||
      key.includes(normalizedPrimary)
  );

  return partialKey ? BRANCH_MAP_CENTERS[partialKey] : DEFAULT_MAP_CENTER;
};

const loadGoogleMaps = () => {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById("google-maps-script");
  if (existingScript) {
    return new Promise<void>((resolve) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed_to_load_google_maps"));
    document.head.appendChild(script);
  });
};

const BoundaryMap = ({
  points,
  areaName,
  fallbackName,
  onAddPoint,
  onUpdatePoint,
  onRemoveLast,
  onClear,
}: {
  points: BoundaryPoint[];
  areaName?: string;
  fallbackName?: string;
  onAddPoint: (lat: string, lng: string) => void;
  onUpdatePoint: (index: number, lat: string, lng: string) => void;
  onRemoveLast: () => void;
  onClear: () => void;
}) => {
  const [mapsReady, setMapsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const polygonRef = React.useRef<any>(null);
  const geocoderRef = React.useRef<any>(null);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  const validPoints = points
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lat) <= 90 &&
        Math.abs(point.lng) <= 180
    );

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch((error) => console.error("GOOGLE MAPS LOAD ERROR:", error));
  }, []);

  const focusMap = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (validPoints.length) {
      const bounds = new window.google.maps.LatLngBounds();
      validPoints.forEach((point) => bounds.extend(point));
      mapInstanceRef.current.fitBounds(bounds);

      if (validPoints.length === 1) {
        mapInstanceRef.current.setZoom(16);
      }
      return;
    }

    mapInstanceRef.current.setCenter(getMapCenter(areaName, fallbackName));
    mapInstanceRef.current.setZoom(12);
  };

  const searchLocation = () => {
    if (!mapsReady || !mapInstanceRef.current || !geocoderRef.current) return;

    const query = searchText.trim();
    if (!query) return;

    geocoderRef.current.geocode(
      { address: query },
      (results: any, status: string) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const location = results[0].geometry.location;
          mapInstanceRef.current.setCenter({
            lat: location.lat(),
            lng: location.lng(),
          });
          mapInstanceRef.current.setZoom(17);
        } else {
          window.alert("تعذر العثور على الموقع المطلوب");
        }
      }
    );
  };

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapRef.current, {
        center: validPoints[0] || getMapCenter(areaName, fallbackName),
        zoom: validPoints.length ? 14 : 12,
        mapTypeId: "roadmap",
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      geocoderRef.current = new maps.Geocoder();

      mapInstanceRef.current.addListener("click", (event: any) => {
        onAddPoint(
          event.latLng.lat().toFixed(6),
          event.latLng.lng().toFixed(6)
        );
      });
    }
  }, [mapsReady, areaName, fallbackName, onAddPoint, validPoints]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const refreshMap = () => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");
      focusMap();
    };

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => {
      refreshMap();
    });
    resizeObserverRef.current.observe(mapRef.current);

    const timerA = window.setTimeout(refreshMap, 100);
    const timerB = window.setTimeout(refreshMap, 350);
    const timerC = window.setTimeout(refreshMap, 700);

    return () => {
      window.clearTimeout(timerA);
      window.clearTimeout(timerB);
      window.clearTimeout(timerC);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [mapsReady, isFullscreen, areaName, fallbackName, validPoints]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !window.google?.maps) return;

    const maps = window.google.maps;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    validPoints.forEach((point, index) => {
      const marker = new maps.Marker({
        position: point,
        map: mapInstanceRef.current,
        label: String(index + 1),
        draggable: true,
      });

      marker.addListener("dragend", (event: any) => {
        onUpdatePoint(
          index,
          event.latLng.lat().toFixed(6),
          event.latLng.lng().toFixed(6)
        );
      });

      markersRef.current.push(marker);
    });

    if (validPoints.length >= 2) {
      polygonRef.current = new maps.Polygon({
        paths: validPoints,
        map: mapInstanceRef.current,
        strokeColor: "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#60a5fa",
        fillOpacity: 0.18,
      });
    }

    focusMap();
  }, [mapsReady, validPoints, onUpdatePoint, areaName, fallbackName]);

  useEffect(() => {
    if (!isFullscreen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[1000] overflow-auto bg-white p-4"
          : "rounded border p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {areaName ? `موقع الحي: ${areaName}` : "خريطة حدود الحي"}
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
        >
          {isFullscreen ? "إغلاق الملء" : "ملء الشاشة"}
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchLocation();
            }
          }}
          placeholder="ابحث عن المدينة أو الحي أو الشارع"
          className="w-full rounded border px-3 py-2"
        />
        <button
          type="button"
          onClick={searchLocation}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
        >
          انتقال
        </button>
      </div>

      <div
        ref={mapRef}
        className={
          isFullscreen
            ? "h-[78vh] w-full overflow-hidden rounded border bg-gray-100"
            : "h-72 w-full overflow-hidden rounded border bg-gray-100"
        }
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRemoveLast}
          className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
        >
          حذف آخر نقطة
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white"
        >
          مسح الكل
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        لا يتم إنشاء أي نقطة تلقائيًا. ابحث عن الموقع أو حرّك الخريطة ثم اضغط
        لإضافة النقاط، ويمكنك سحب أي نقطة محفوظة لتعديل مكانها.
      </p>
    </div>
  );
};

const Neighborhoods: React.FC = () => {
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  const isAdminBranch = Boolean(user?.is_admin_branch);

  const [search, setSearch] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [fee, setFee] = useState<number>(0);
  const [branchId, setBranchId] = useState<number>(0);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([
    emptyBoundaryPoint(),
  ]);

  const selectedBranch = branches.find((branch) => branch.id === branchId);

  const fetchNeighborhoods = async (query: string) => {
    try {
      setLoading(true);

      const headers: any = {};
      const selected = localStorage.getItem("branch_id");

      if (isAdminBranch) {
        if (selected && Number(selected) !== Number(user?.branch_id)) {
          headers["x-branch-id"] = selected;
        }
      } else if (user?.branch_id) {
        headers["x-branch-id"] = user.branch_id;
      }

      const res = await api.get("/neighborhoods", {
        params: { search: query },
        headers,
      });

      setNeighborhoods(res?.data?.success ? res.data.neighborhoods || [] : []);
    } catch (err) {
      console.error("خطأ جلب الأحياء:", err);
      setNeighborhoods([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!isAdminBranch) return;

    try {
      const res = await api.get("/branches");
      const list = res.data.branches || [];
      setBranches(
        list.filter(
          (b: { is_admin?: number | boolean }) =>
            !(b.is_admin === 1 || b.is_admin === true)
        )
      );
    } catch (err) {
      console.error("خطأ جلب الفروع:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchNeighborhoods("");
  }, []);

  const openAdd = () => {
    setEditId(null);
    setName("");
    setNameEn("");
    setFee(0);
    setBoundaryPoints([emptyBoundaryPoint()]);

    if (isAdminBranch) {
      const selected = localStorage.getItem("branch_id");
      if (selected && Number(selected) !== Number(user?.branch_id)) {
        setBranchId(Number(selected));
      } else {
        setBranchId(0);
      }
    } else {
      setBranchId(user?.branch_id || 0);
    }

    setIsModalOpen(true);
  };

  const startEdit = (n: Neighborhood) => {
    setEditId(n.id);
    setName(n.name);
    setNameEn(n.name_en || "");
    setFee(n.delivery_fee);
    setBranchId(n.branch_id);
    setBoundaryPoints(
      n.boundary_points?.length
        ? n.boundary_points.map((point) => ({
            lat: String(point.lat),
            lng: String(point.lng),
          }))
        : [emptyBoundaryPoint()]
    );
    setIsModalOpen(true);
  };

  const normalizedBoundaryPoints = boundaryPoints
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lat) <= 90 &&
        Math.abs(point.lng) <= 180
    );

  const saveNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalBranchId = isAdminBranch ? branchId : user?.branch_id;

    if (!finalBranchId) {
      alert("يجب اختيار فرع صحيح");
      return;
    }

    const hasPartialPoint = boundaryPoints.some(
      (point) =>
        (point.lat.trim() && !point.lng.trim()) ||
        (!point.lat.trim() && point.lng.trim())
    );

    if (hasPartialPoint) {
      alert("أكمل كل نقطة بخط العرض وخط الطول");
      return;
    }

    try {
      const payload = {
        branch_id: finalBranchId,
        name,
        name_en: nameEn || "",
        delivery_fee: fee,
        boundary_points: normalizedBoundaryPoints,
      };

      if (editId) {
        await api.put(`/neighborhoods/${editId}`, payload);
      } else {
        await api.post("/neighborhoods", payload);
      }

      setIsModalOpen(false);
      fetchNeighborhoods(search);
    } catch (err) {
      console.error("خطأ الحفظ:", err);
    }
  };

  const deleteNeighborhood = async (id: number) => {
    if (!window.confirm("هل تريد حذف الحي؟")) return;
    await api.delete(`/neighborhoods/${id}`);
    fetchNeighborhoods(search);
  };

  const updateBoundaryPoint = (
    index: number,
    key: keyof BoundaryPoint,
    value: string
  ) => {
    setBoundaryPoints((prev) =>
      prev.map((point, currentIndex) =>
        currentIndex === index ? { ...point, [key]: value } : point
      )
    );
  };

  const addBoundaryPoint = () => {
    setBoundaryPoints((prev) => [...prev, emptyBoundaryPoint()]);
  };

  const removeBoundaryPoint = (index: number) => {
    setBoundaryPoints((prev) =>
      prev.length === 1 ? [emptyBoundaryPoint()] : prev.filter((_, i) => i !== index)
    );
  };

  const addBoundaryPointFromMap = (lat: string, lng: string) => {
    setBoundaryPoints((prev) => {
      const hasSingleEmptyPoint =
        prev.length === 1 && !prev[0].lat.trim() && !prev[0].lng.trim();

      if (hasSingleEmptyPoint) {
        return [{ lat, lng }];
      }

      return [...prev, { lat, lng }];
    });
  };

  const removeLastBoundaryPoint = () => {
    setBoundaryPoints((prev) =>
      prev.length <= 1 ? [emptyBoundaryPoint()] : prev.slice(0, -1)
    );
  };

  const clearBoundaryPoints = () => {
    setBoundaryPoints([emptyBoundaryPoint()]);
  };

  return (
    <div className="p-4" style={{ direction: "rtl" }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأحياء</h1>
        <button
          onClick={openAdd}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          إضافة حي
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          fetchNeighborhoods(e.target.value);
        }}
        placeholder="اكتب اسم الحي..."
        className="mb-4 w-1/2 rounded border px-3 py-2"
      />

      {loading ? (
        <p>جارٍ التحميل...</p>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">اسم الحي</th>
              <th className="p-2">الاسم (EN)</th>
              <th className="p-2">سعر التوصيل</th>
              <th className="p-2">الفرع</th>
              <th className="p-2">الحدود</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {neighborhoods.map((n, i) => (
              <tr key={n.id} className="border-t">
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2">{n.name}</td>
                <td className="p-2" dir="ltr">{n.name_en || "—"}</td>
                <td className="p-2">{n.delivery_fee}</td>
                <td className="p-2">{n.branch_name || "-"}</td>
                <td className="p-2 text-center">
                  {n.boundary_points?.length
                    ? `${n.boundary_points.length} نقطة`
                    : "بدون حدود"}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => startEdit(n)}
                    className="mx-1 text-blue-600"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => deleteNeighborhood(n.id)}
                    className="mx-1 text-red-600"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {!neighborhoods.length && (
              <tr>
                <td colSpan={7} className="py-4 text-center">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">
              {editId ? "تعديل حي" : "إضافة حي"}
            </h2>

            <form onSubmit={saveNeighborhood} className="space-y-3">
              {isAdminBranch && (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(Number(e.target.value))}
                  className="w-full border p-2"
                >
                  <option value={0}>اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2"
                placeholder="اسم الحي"
                required
              />

              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full border p-2"
                placeholder="Neighborhood name (English)"
                dir="ltr"
              />

              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full border p-2"
                placeholder="سعر التوصيل"
                required
              />

              <div className="rounded border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">حدود الحي</h4>
                    <p className="text-sm text-gray-500">
                      أضف عدة نقاط لتحديد نطاق الحي مثل الفروع.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addBoundaryPoint}
                    className="rounded bg-indigo-500 px-3 py-1 text-sm text-white"
                  >
                    إضافة نقطة
                  </button>
                </div>

                <div className="mb-4">
                  <BoundaryMap
                    points={boundaryPoints}
                    areaName={name}
                    fallbackName={selectedBranch?.name}
                    onAddPoint={addBoundaryPointFromMap}
                    onUpdatePoint={(index, lat, lng) => {
                      updateBoundaryPoint(index, "lat", lat);
                      updateBoundaryPoint(index, "lng", lng);
                    }}
                    onRemoveLast={removeLastBoundaryPoint}
                    onClear={clearBoundaryPoints}
                  />
                </div>

                <div className="space-y-3">
                  {boundaryPoints.map((point, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <input
                        className="w-full border p-2"
                        placeholder="خط العرض Latitude"
                        value={point.lat}
                        onChange={(e) =>
                          updateBoundaryPoint(index, "lat", e.target.value)
                        }
                      />
                      <input
                        className="w-full border p-2"
                        placeholder="خط الطول Longitude"
                        value={point.lng}
                        onChange={(e) =>
                          updateBoundaryPoint(index, "lng", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeBoundaryPoint(index)}
                        className="rounded bg-red-100 px-3 py-2 text-sm text-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-sm text-gray-500">
                  النقاط الصالحة الحالية: {normalizedBoundaryPoints.length}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded bg-gray-300 px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded bg-green-600 px-4 py-2 text-white"
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

export default Neighborhoods;
