import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Suspense } from "react";

import { Geolocation } from "@capacitor/geolocation";


import {
  MapContainer,
  TileLayer,
  Marker,
} from "../utils/leafletLoader";


const BRAND_COLOR = "#fbbf24"; // أصفر

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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

// لإعادة تمركز الخريطة عند تغير الإحداثيات
function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, map.getZoom(), { animate: true });
  }, [pos]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const target = (location.state as any)?.target || "pickup";

  const [pos, setPos] = useState<[number, number]>([15.3694, 44.1910]); // اليمن
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const HEADER_HEIGHT = 130;

  const handleSave = () => {
    if (!name.trim()) {
      setError("يجب إدخال اسم العنوان قبل الحفظ");
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
        setPos([parseFloat(j[0].lat), parseFloat(j[0].lon)]);
      }
    } catch {
      setError("تعذر البحث عن الموقع");
    }
  };

  const goToMyLocation = async () => {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== "granted") {
        setError("يجب السماح للتطبيق بالوصول إلى الموقع");
        return;
      }

      const p = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      setPos([p.coords.latitude, p.coords.longitude]);
    } catch {
      setError("تعذر تحديد موقعك الحالي");
    }
  };

  return (
    <div style={{ height: "100vh", direction: "rtl", position: "relative" }}>
      {/* Header + Search */}
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
              color: "#111",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            الموقع على الخريطة
          </div>

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
              color: "#111",
              fontWeight: "bold",
            }}
          >
            🔍
          </button>
        </div>
      </div>

 {/* Map */}
<Suspense fallback={<div className="p-6 text-center">⏳ جاري تحميل الخريطة...</div>}>

  <MapContainer
    center={pos}
    zoom={14}
    style={{ height: "100%", marginTop: HEADER_HEIGHT }}
  >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
              color: "#111",
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
              color: "#111",
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
