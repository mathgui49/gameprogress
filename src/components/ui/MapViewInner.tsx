"use client";

import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const wingIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "hue-rotate-[260deg] brightness-125",
});

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  isWing?: boolean;
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [markers, map]);
  return null;
}

export default function MapViewInner({ markers, center = [48.8566, 2.3522], zoom = 5, className }: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`h-full w-full rounded-xl ${className ?? ""}`}
      style={{ minHeight: "300px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.length > 0 && <FitBounds markers={markers} />}
      {markers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={m.isWing ? wingIcon : defaultIcon}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{m.label}</p>
              {m.sublabel && <p className="text-gray-500">{m.sublabel}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
