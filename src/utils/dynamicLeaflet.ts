import React from "react";

export const MapContainer = React.lazy(() =>
  import("react-leaflet").then((m) => ({ default: m.MapContainer }))
);

export const TileLayer = React.lazy(() =>
  import("react-leaflet").then((m) => ({ default: m.TileLayer }))
);

export const Marker = React.lazy(() =>
  import("react-leaflet").then((m) => ({ default: m.Marker }))
);

export const useMapEvents = () => {};
export const useMap = () => {};
