import React, { useEffect, useState } from "react";
import api from "../services/api";

type BoundaryPoint = {
  lat: string;
  lng: string;
};

const GOOGLE_MAPS_KEY = "AIzaSyD1Cg7YKXlWGMhVLjRKy0GmlL149_W08SQ";
const DEFAULT_MAP_CENTER = { lat: 15.369445, lng: 44.191006 };
const BRANCH_MAP_CENTERS: Record<string, { lat: number; lng: number }> = {
  "صنعاء": { lat: 15.369445, lng: 44.191006 },
  "عدن": { lat: 12.785497, lng: 45.018654 },
  "شيخ عثمان": { lat: 12.886905, lng: 44.987622 },
  "المنصورة": { lat: 12.85184, lng: 44.9818 },
  "عتق": { lat: 14.53767, lng: 46.83187 },
  "شبوة": { lat: 14.53767, lng: 46.83187 },
  "المكلا": { lat: 14.54248, lng: 49.12424 },
  "سيئون": { lat: 15.94194, lng: 48.78708 },
  "تعز": { lat: 13.57952, lng: 44.02091 },
  "إب": { lat: 13.96667, lng: 44.18333 },
  "ذمار": { lat: 14.54274, lng: 44.40514 },
  "الحديدة": { lat: 14.79781, lng: 42.95452 },
};

declare global {
  interface Window {
    google: any;
  }
}

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  boundary_points?: Array<{ lat: number; lng: number }>;
  today_from?: string;
  today_to?: string;
  today_closed?: boolean;
}

interface UserInfo {
  branch_id: number;
  is_admin_branch: boolean;
}

type DayItem = {
  day: number;
  name: string;
  from: string;
  to: string;
  closed: boolean;
};

const daysInit: DayItem[] = [
  { day: 0, name: "السبت", from: "", to: "", closed: false },
  { day: 1, name: "الأحد", from: "", to: "", closed: false },
  { day: 2, name: "الإثنين", from: "", to: "", closed: false },
  { day: 3, name: "الثلاثاء", from: "", to: "", closed: false },
  { day: 4, name: "الأربعاء", from: "", to: "", closed: false },
  { day: 5, name: "الخميس", from: "", to: "", closed: false },
  { day: 6, name: "الجمعة", from: "", to: "", closed: false },
];

const emptyBoundaryPoint = (): BoundaryPoint => ({ lat: "", lng: "" });

const getBranchMapCenter = (branchName?: string, branchAddress?: string) => {
  const normalizedName = String(branchName || "").trim();
  const normalizedAddress = String(branchAddress || "").trim();
  const combined = `${normalizedName} ${normalizedAddress}`.trim();

  if (!combined) return DEFAULT_MAP_CENTER;

  const direct =
    BRANCH_MAP_CENTERS[normalizedName] || BRANCH_MAP_CENTERS[combined];
  if (direct) return direct;

  const partialKey = Object.keys(BRANCH_MAP_CENTERS).find(
    (key) =>
      normalizedName.includes(key) ||
      normalizedAddress.includes(key) ||
      key.includes(normalizedName)
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

const BranchBoundaryMap = ({
  points,
  branchName,
  branchAddress,
  onAddPoint,
  onRemoveLast,
  onClear,
}: {
  points: BoundaryPoint[];
  branchName?: string;
  branchAddress?: string;
  onAddPoint: (lat: string, lng: string) => void;
  onRemoveLast: () => void;
  onClear: () => void;
}) => {
  const [mapsReady, setMapsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const center =
      validPoints[0] || getBranchMapCenter(branchName, branchAddress);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapRef.current, {
        center,
        zoom: validPoints.length ? 14 : 11,
        mapTypeId: "roadmap",
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: maps.ControlPosition.TOP_LEFT,
        },
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: maps.ControlPosition.TOP_RIGHT,
        },
      });
      geocoderRef.current = new maps.Geocoder();

      mapInstanceRef.current.addListener("click", (event: any) => {
        onAddPoint(
          event.latLng.lat().toFixed(6),
          event.latLng.lng().toFixed(6)
        );
      });
    }
  }, [mapsReady, branchName, branchAddress]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    const refreshMap = () => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");

      if (validPoints.length) {
        const bounds = new window.google.maps.LatLngBounds();
        validPoints.forEach((point) => bounds.extend(point));
        mapInstanceRef.current.fitBounds(bounds);

        if (validPoints.length === 1) {
          mapInstanceRef.current.setZoom(17);
        }
      } else {
        mapInstanceRef.current.setCenter(
          getBranchMapCenter(branchName, branchAddress)
        );
        mapInstanceRef.current.setZoom(16);
      }
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
  }, [
    mapsReady,
    isFullscreen,
    branchName,
    branchAddress,
    points,
    validPoints.length,
  ]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !window.google?.maps) return;

    const runResize = () => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");

      if (validPoints.length) {
        const bounds = new window.google.maps.LatLngBounds();
        validPoints.forEach((point) => bounds.extend(point));
        mapInstanceRef.current.fitBounds(bounds);

        if (validPoints.length === 1) {
          mapInstanceRef.current.setZoom(17);
        }
      } else {
        mapInstanceRef.current.setCenter(
          getBranchMapCenter(branchName, branchAddress)
        );
        mapInstanceRef.current.setZoom(15);
      }
    };

    const timer = window.setTimeout(runResize, 250);
    return () => window.clearTimeout(timer);
  }, [mapsReady, branchName, branchAddress, validPoints.length]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || validPoints.length) return;

    const maps = window.google.maps;
    const fallbackCenter = getBranchMapCenter(branchName, branchAddress);
    const searchQuery = [branchName, branchAddress].filter(Boolean).join(" - ");

    mapInstanceRef.current.setCenter(fallbackCenter);
    mapInstanceRef.current.setZoom(13);

    if (!searchQuery || !geocoderRef.current) return;

    geocoderRef.current.geocode(
      { address: searchQuery },
      (results: any, status: string) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const location = results[0].geometry.location;
          mapInstanceRef.current.setCenter({
            lat: location.lat(),
            lng: location.lng(),
          });
          mapInstanceRef.current.setZoom(17);
        } else {
          mapInstanceRef.current.setCenter(fallbackCenter);
          mapInstanceRef.current.setZoom(16);
        }
      }
    );
  }, [mapsReady, validPoints.length, branchName, branchAddress]);

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

    if (validPoints.length) {
      const bounds = new maps.LatLngBounds();
      validPoints.forEach((point) => bounds.extend(point));
      mapInstanceRef.current.fitBounds(bounds);

      if (validPoints.length === 1) {
        mapInstanceRef.current.setZoom(15);
      }
    } else {
      mapInstanceRef.current.setCenter(
        getBranchMapCenter(branchName, branchAddress)
      );
      mapInstanceRef.current.setZoom(13);
    }
  }, [mapsReady, points, branchName, branchAddress]);

  useEffect(() => {
    if (!isFullscreen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !window.google?.maps) return;

    const timer = window.setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, "resize");

      if (validPoints.length) {
        const bounds = new window.google.maps.LatLngBounds();
        validPoints.forEach((point) => bounds.extend(point));
        mapInstanceRef.current.fitBounds(bounds);
      } else {
        mapInstanceRef.current.setCenter(
          getBranchMapCenter(branchName, branchAddress)
        );
        mapInstanceRef.current.setZoom(16);
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [isFullscreen, mapsReady, validPoints, branchName, branchAddress]);

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
          {branchName ? `موقع الفرع: ${branchName}` : "خريطة حدود الفرع"}
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
        >
          {isFullscreen ? "إغلاق الملء" : "ملء الشاشة"}
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
        اضغط على الخريطة لإضافة نقاط حدود الفرع بالترتيب. يتم فتحها على أقرب
        منطقة للفرع تلقائياً.
      </p>
    </div>
  );
};

const WorkTimeModal = ({
  branchId,
  onClose,
}: {
  branchId: number;
  onClose: () => void;
}) => {
  const [days, setDays] = useState<DayItem[]>(daysInit);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.get(`/branch-work-times/${branchId}`).then((res) => {
      if (res.data?.days?.length) {
        const mapped = daysInit.map((d) => {
          const found = res.data.days.find((x: any) => x.day === d.day);
          return found
            ? {
                ...d,
                from: found.from || "",
                to: found.to || "",
                closed: Boolean(found.closed),
              }
            : d;
        });
        setDays(mapped);
      }
      if (res.data?.notes) setNotes(res.data.notes);
    });
  }, [branchId]);

  const updateDay = (i: number, key: keyof DayItem, value: any) => {
    const copy = [...days];
    copy[i] = { ...copy[i], [key]: value };
    setDays(copy);
  };

  const hasClosed = days.some((d) => d.closed);

  const save = async () => {
    await api.post(`/branch-work-times/${branchId}`, {
      days,
      notes: hasClosed ? notes : "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-w-full rounded bg-white p-6">
        <h3 className="mb-4 text-xl font-bold">وقت الدوام</h3>

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {days.map((d, i) => (
            <div key={d.day} className="rounded border p-3">
              <div className="mb-2 font-bold">{d.name}</div>

              <div className="mb-2 flex gap-2">
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.from}
                  onChange={(e) => updateDay(i, "from", e.target.value)}
                  className="w-full border p-1"
                />
                <input
                  type="time"
                  disabled={d.closed}
                  value={d.to}
                  onChange={(e) => updateDay(i, "to", e.target.value)}
                  className="w-full border p-1"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={d.closed}
                  onChange={(e) => updateDay(i, "closed", e.target.checked)}
                />
                مغلق
              </label>
            </div>
          ))}
        </div>

        <textarea
          placeholder="ملاحظات عند الإغلاق"
          disabled={!hasClosed}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`mb-4 w-full border p-2 ${!hasClosed ? "bg-gray-100" : ""}`}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-gray-300 px-4 py-2">
            إلغاء
          </button>
          <button
            onClick={save}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

const BranchesSettings: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([
    emptyBoundaryPoint(),
  ]);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [timeBranchId, setTimeBranchId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));

      const res = await api.get("/branches");
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setSelectedBranchId(null);
    setName("");
    setAddress("");
    setPhone("");
    setBoundaryPoints([emptyBoundaryPoint()]);
  };

  const openAddModal = () => {
    setEditMode(false);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditMode(true);
    setSelectedBranchId(branch.id);
    setName(branch.name);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setBoundaryPoints(
      branch.boundary_points?.length
        ? branch.boundary_points.map((point) => ({
            lat: String(point.lat ?? ""),
            lng: String(point.lng ?? ""),
          }))
        : [emptyBoundaryPoint()]
    );
    setIsModalOpen(true);
  };

  const canEditBranch = (branch: Branch) =>
    Boolean(user?.is_admin_branch || Number(user?.branch_id) === Number(branch.id));

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

  const handleSave = async () => {
    if (!name.trim()) return alert("أدخل اسم الفرع");

    const hasPartialPoint = boundaryPoints.some(
      (point) =>
        (point.lat.trim() && !point.lng.trim()) ||
        (!point.lat.trim() && point.lng.trim())
    );

    if (hasPartialPoint) {
      return alert("أكمل كل نقطة بإحداثيات خط العرض وخط الطول");
    }

    const data = {
      name,
      address,
      phone,
      boundary_points: normalizedBoundaryPoints,
    };

    try {
      if (editMode && selectedBranchId) {
        await api.put(`/branches/${selectedBranchId}`, data);
      } else {
        const res = await api.post("/branches", data);
        const newId = res.data.id;
        setIsModalOpen(false);

        if (user?.is_admin_branch && newId) {
          setTimeBranchId(newId);
          setIsTimeModalOpen(true);
        }
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد؟")) return;
    await api.delete(`/branches/${id}`);
    fetchData();
  };

  const openTimeModal = (id: number) => {
    setTimeBranchId(id);
    setIsTimeModalOpen(true);
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
        <h2 className="text-2xl font-bold">الفروع</h2>

        {user?.is_admin_branch && (
          <button
            onClick={openAddModal}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            إضافة فرع
          </button>
        )}
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">الاسم</th>
            <th className="border p-2">العنوان</th>
            <th className="border p-2">الهاتف</th>
            <th className="border p-2">الحدود</th>
            <th className="border p-2">الوقت / الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td className="border p-2">{b.name}</td>
              <td className="border p-2">{b.address || "-"}</td>
              <td className="border p-2">{b.phone || "-"}</td>
              <td className="border p-2 text-center">
                {b.boundary_points?.length
                  ? `${b.boundary_points.length} نقطة`
                  : "بدون حدود"}
              </td>

              <td className="border p-2 text-center">
                <div
                  onClick={() => openTimeModal(b.id)}
                  className="mb-2 cursor-pointer rounded bg-blue-500 px-3 py-2 text-sm text-white transition hover:bg-blue-600"
                >
                  {b.today_closed ? (
                    <span>مغلق اليوم</span>
                  ) : b.today_from && b.today_to ? (
                    <span>
                      {b.today_from} - {b.today_to}
                    </span>
                  ) : (
                    <span>أوقات الدوام</span>
                  )}
                </div>

                <div className="space-x-1 space-x-reverse">
                  {canEditBranch(b) && (
                    <button
                      onClick={() => openEditModal(b)}
                      className="rounded bg-green-500 px-2 py-1 text-white"
                    >
                      تعديل
                    </button>
                  )}

                  {user?.is_admin_branch && (
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="rounded bg-red-500 px-2 py-1 text-white"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-[42rem] overflow-y-auto rounded bg-white p-6">
            <h3 className="mb-3 font-bold">
              {editMode ? "تعديل فرع" : "إضافة فرع"}
            </h3>

            <input
              className="mb-2 w-full border p-2"
              placeholder="اسم الفرع"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="mb-2 w-full border p-2"
              placeholder="العنوان"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              className="mb-3 w-full border p-2"
              placeholder="الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="rounded border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold">حدود الفرع</h4>
                  <p className="text-sm text-gray-500">
                    أضف عدة نقاط خط عرض وخط طول لتحديد نطاق الفرع.
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
                <BranchBoundaryMap
                  points={boundaryPoints}
                  branchName={name}
                  branchAddress={address}
                  onAddPoint={addBoundaryPointFromMap}
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

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button
                onClick={handleSave}
                className="rounded bg-blue-500 px-4 py-1 text-white"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {isTimeModalOpen && timeBranchId && (
        <WorkTimeModal
          branchId={timeBranchId}
          onClose={() => setIsTimeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default BranchesSettings;
