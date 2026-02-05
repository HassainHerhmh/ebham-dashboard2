import { useEffect, useState, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
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

export default function MapPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const target = (location.state as any)?.target || "from";

  const [pos, setPos] = useState<[number, number]>([
    15.3694,
    44.191,
  ]);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const HEADER_HEIGHT = 130;

  /* Save */
  const handleSave = () => {
    if (!name.trim()) {
      setError("اكتب اسم العنوان");
      return;
    }

    navigate("/wassel-lee", {
      state: {
        from: "map",
        target,
        value: name,
        lat: pos[0],
        lng: pos[1],
      },
    });
  };

  /* Search */
  const searchByName = async () => {
    if (!name.trim()) return;

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          name + " اليمن"
        )}`
      );

      const j = await r.json();

      if (j[0]) {
        setPos([
          parseFloat(j[0].lat),
          parseFloat(j[0].lon),
        ]);
      }
    } catch {
      setError("فشل البحث");
    }
  };

  /* My location */
  const goToMyLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([
          p.coords.latitude,
          p.coords.longitude,
        ]);
      },
      () => {
        setError("فشل تحديد الموقع");
      },
      { enableHighAccuracy: true }
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
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
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
              fontSize: 16,
            }}
          >
            ←
          </button>

          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
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
              outline: "none",
            }}
          />

          <button
            onClick={searchByName}
            style={{
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              background: "#fff",
              fontWeight: "bold",
            }}
          >
            🔍
          </button>
        </div>
      </div>

      {/* Map */}
      <Suspense
        fallback={
          <div className="p-6 text-center">
            ⏳ تحميل الخريطة...
          </div>
        }
      >
        <MapContainer
          center={pos}
          zoom={14}
          style={{
            height: "100%",
            marginTop: HEADER_HEIGHT,
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              border: "none",
              background: BRAND_COLOR,
              fontWeight: "bold",
            }}
          >
            حفظ الموقع
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
            موقعي الحالي
          </button>
        </div>
      </div>
    </div>
  );
}
