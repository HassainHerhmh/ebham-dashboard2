import { useEffect, useState, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* Fix marker icon */
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BRAND_COLOR = "#fbbf24";

/* Click handler */
function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

/* Recenter map */
function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(pos, 15, { animate: true });
  }, [pos]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const location = useLocation();

const state = location.state as any;

const target = state?.target || "from";
const returnTo = "/wassel-orders";

  const [pos, setPos] = useState<[number, number]>([15.3694, 44.191]);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  /* نوع الخريطة */
  const [mapType, setMapType] = useState<"normal" | "sat">("normal");

  const HEADER_HEIGHT = 130;

  /* حفظ الموقع */
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
      lat: pos[0],
      lng: pos[1],
    },
  });
};




  /* البحث */
  const searchByName = async () => {
    if (!name.trim()) return;

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          name
        )}`
      );

      const j = await r.json();

      if (j[0]) {
        setPos([
          parseFloat(j[0].lat),
          parseFloat(j[0].lon),
        ]);
      } else {
        setError("لم يتم العثور على موقع");
      }
    } catch {
      setError("فشل البحث");
    }
  };

  /* موقعي الحالي */
  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;

        setPos([lat, lng]);

        // جلب اسم العنوان
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );

          const j = await r.json();

          if (j.display_name) {
            setName(j.display_name);
          }
        } catch {}
      },
      () => {
        setError("فعّل الموقع من الإعدادات");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div
      style={{
        height: "100vh",
        direction: "rtl",
        position: "relative",
      }}
    >
      {/* Header */}
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
        {/* Top */}
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

          <div style={{ fontWeight: "bold" }}>
            اختر الموقع
          </div>

          <div style={{ width: 40 }} />
        </div>

        {/* Search */}
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
            🔍
          </button>
        </div>
      </div>

      {/* Map */}
      <Suspense fallback={<div>تحميل...</div>}>
        <MapContainer
          center={pos}
          zoom={14}
          style={{
            height: "100%",
            marginTop: HEADER_HEIGHT,
          }}
        >
          {/* Normal */}
          {mapType === "normal" && (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}

          {/* Satellite */}
          {mapType === "sat" && (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          )}

          <Recenter pos={pos} />

          <ClickHandler
            onPick={(lat, lng) =>
              setPos([lat, lng])
            }
          />

          <Marker position={pos} />
        </MapContainer>
      </Suspense>

      {/* Bottom */}
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

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>

          {/* Satellite toggle */}
          <button
            onClick={() =>
              setMapType(
                mapType === "normal"
                  ? "sat"
                  : "normal"
              )
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
            🛰️ قمر صناعي
          </button>

          {/* My location */}
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
            📍 موقعي
          </button>
        </div>

        {/* Save */}
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
