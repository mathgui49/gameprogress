"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const MapPickerInner = dynamic(() => import("./MapPickerInner"), {
  ssr: false,
  loading: () => <div className="h-[250px] rounded-xl bg-[#1a1626] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>,
});

interface MapPickerProps {
  lat: number;
  lng: number;
  address: string;
  onAddressChange: (address: string) => void;
  onCoordsChange: (lat: number, lng: number) => void;
  label?: string;
}

export function MapPicker({ lat, lng, address, onAddressChange, onCoordsChange, label }: MapPickerProps) {
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const geocode = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.length > 0) {
        onCoordsChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } finally {
      setSearching(false);
    }
  }, [onCoordsChange]);

  const reverseGeocode = useCallback(async (newLat: number, newLng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`);
      const data = await res.json();
      if (data.display_name) {
        onAddressChange(data.display_name);
      }
    } catch {}
  }, [onAddressChange]);

  const handleSelect = useCallback((newLat: number, newLng: number) => {
    onCoordsChange(newLat, newLng);
    reverseGeocode(newLat, newLng);
  }, [onCoordsChange, reverseGeocode]);

  const handleAddressInput = (value: string) => {
    onAddressChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocode(value), 800);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-[#a09bb2] mb-1">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => handleAddressInput(e.target.value)}
          placeholder="Rechercher une adresse..."
          className="w-full px-3 py-2.5 rounded-xl bg-[#1a1626] border border-[rgba(192,132,252,0.08)] text-sm text-white placeholder:text-[#3d3650] focus:outline-none focus:border-[#c084fc]/30 transition-colors"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="h-[250px] rounded-xl overflow-hidden border border-[rgba(192,132,252,0.08)]">
        <MapPickerInner lat={lat} lng={lng} onSelect={handleSelect} />
      </div>
      <p className="text-[10px] text-[#6b6580]">Clique sur la carte pour placer le point de rassemblement</p>
    </div>
  );
}
