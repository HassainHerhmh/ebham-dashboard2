import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const BRAND_COLOR = "#fbbf24";
const GOOGLE_MAPS_KEY = "AIzaSyD1Cg7YKXlWGMhVLjRKy0GmlL149_W08SQ";
const DEFAULT_CENTER = { lat: 15.3694, lng: 44.191 };
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

type MapTarget = "from" | "to";

function getBranchMapCenter(branchName?: string) {
  const normalized = String(branchName || "").trim();
  if (!normalized) return DEFAULT_CENTER;

  const direct = BRANCH_MAP_CENTERS[normalized];
  if (direct) return direct;

  const partialKey = Object.keys(BRANCH_MAP_CENTERS).find(
    (key) => normalized.includes(key) || key.includes(normalized)
  );

  return partialKey ? BRANCH_MAP_CENTERS[partialKey] : DEFAULT_CENTER;
}

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  const existing = document.getElementById("google-maps-script");
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed_to_load_google_maps"));
    document.head.appendChild(script);
  });
}

export default function MapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || {};

  const target: MapTarget = state?.target || "from";
  const returnTo = "/orders/wassel";
  const savedUser = localStorage.getItem("user");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const selectedBranchName =
    localStorage.getItem("selectedBranch") ||
    localStorage.getItem("branch_name") ||
    currentUser?.branch_name ||
    "";
  const branchCenter = getBranchMapCenter(selectedBranchName);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [pos, setPos] = useState(branchCenter);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");

  const HEADER_HEIGHT = 130;

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setError("تعذر تحميل خرائط Google"));
  }, []);

  useEffect(() => {
    if (state?.lat && state?.lng) {
      setPos({
        lat: Number(state.lat),
        lng: Number(state.lng),
      });
      if (state?.value) {
        setName(String(state.value));
      }
      return;
    }

    setPos(branchCenter);
  }, [state?.lat, state?.lng, state?.value, branchCenter.lat, branchCenter.lng]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapRef.current, {
        center: pos,
        zoom: 15,
        mapTypeId: mapType,
        streetViewControl: false,
        fullscreenControl: false,
      });

      markerRef.current = new maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        draggable: false,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });

      geocoderRef.current = new maps.Geocoder();

      mapInstanceRef.current.addListener("click", (event: any) => {
        const picked = {
          lat: Number(event.latLng.lat().toFixed(6)),
          lng: Number(event.latLng.lng().toFixed(6)),
        };

        setPos(picked);
        setError("");
      });
    }
  }, [mapsReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !window.google?.maps) return;

    mapInstanceRef.current.setCenter(pos);
    markerRef.current.setPosition(pos);
  }, [pos]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    mapInstanceRef.current.setMapTypeId(mapType);
  }, [mapType]);

  const handleSave = () => {
    if (!name.trim()) {
      setError("اكتب اسم العنوان");
      return;
    }

    navigate(returnTo, {
      state: {
        from: "map",
        target,
        value: name,
        lat: pos.lat,
        lng: pos.lng,
        reopenModal: true,
      },
    });
  };

  const searchByName = async () => {
    if (!name.trim()) return;
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode({ address: name }, (results: any, status: string) => {
      if (status === "OK" && results?.[0]) {
        const location = results[0].geometry.location;
        setPos({
          lat: Number(location.lat().toFixed(6)),
          lng: Number(location.lng().toFixed(6)),
        });
        setError("");
      } else {
        setError("لم يتم العثور على الموقع");
      }
    });
  };

  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const nextPos = {
          lat: Number(p.coords.latitude.toFixed(6)),
          lng: Number(p.coords.longitude.toFixed(6)),
        };

        setPos(nextPos);
        setError("");

        if (!geocoderRef.current) return;

        geocoderRef.current.geocode({ location: nextPos }, (results: any, status: string) => {
          if (status === "OK" && results?.[0]?.formatted_address) {
            setName(results[0].formatted_address);
          }
        });
      },
      () => setError("فعّل الموقع من الإعدادات"),
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const mapTypeLabel = useMemo(
    () => (mapType === "roadmap" ? "قمر صناعي" : "خريطة عادية"),
    [mapType]
  );

  return (
    <div
      style={{
        height: "100vh",
        direction: "rtl",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: 0,
          zIndex: 1000,
          background: BRAND_COLOR,
          padding: "22px 12px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,0.4)",
              border: "none",
              borderRadius: 10,
              padding: "6px 10px",
            }}
          >
            ←
          </button>

          <div style={{ fontWeight: "bold" }}>اختر الموقع</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="اسم العنوان"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 12,
              border: "none",
            }}
          />

          <button
            onClick={searchByName}
            style={{
              padding: "0 14px",
              borderRadius: 12,
              background: "#fff",
              border: "none",
            }}
          >
            🔎
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        style={{
          position: "absolute",
          top: HEADER_HEIGHT,
          right: 0,
          left: 0,
          bottom: 0,
          background: "#e5e7eb",
        }}
      />

      {!mapsReady && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.5)",
            zIndex: 900,
            marginTop: HEADER_HEIGHT,
          }}
        >
          جاري تحميل الخريطة...
        </div>
      )}

      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: 8,
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() =>
              setMapType(mapType === "roadmap" ? "satellite" : "roadmap")
            }
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: "bold",
            }}
          >
            {mapTypeLabel}
          </button>

          <button
            onClick={goToMyLocation}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: "bold",
            }}
          >
            موقعي
          </button>
        </div>

        <button
          onClick={handleSave}
          style={{
            padding: 14,
            borderRadius: 16,
            border: "none",
            background: BRAND_COLOR,
            fontWeight: "bold",
          }}
        >
          حفظ الموقع
        </button>
      </div>
    </div>
  );
}
