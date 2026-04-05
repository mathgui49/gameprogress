"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const MapPickerInner = dynamic(() => import("./MapPickerInner"), {
  ssr: false,
  loading: () => <div className="h-[250px] rounded-xl bg-[var(--surface-high)] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>,
});

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  address: string;
  onAddressChange: (address: string) => void;
  onCoordsChange: (lat: number, lng: number) => void;
  label?: string;
  readOnly?: boolean;
}

export function MapPicker({ lat, lng, address, onAddressChange, onCoordsChange, label, readOnly }: MapPickerProps) {
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchAddress = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } finally {
      setSearching(false);
    }
  }, []);

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
    if (readOnly) return;
    onCoordsChange(newLat, newLng);
    reverseGeocode(newLat, newLng);
  }, [onCoordsChange, reverseGeocode, readOnly]);

  const handleAddressInput = (value: string) => {
    onAddressChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(value), 500);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    onAddressChange(suggestion.display_name);
    onCoordsChange(parseFloat(suggestion.lat), parseFloat(suggestion.lon));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">{label}</label>}
      {!readOnly && (
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => handleAddressInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Rechercher une adresse..."
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--primary)]/30 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden glass-card shadow-xl border border-[var(--border)]">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-xs text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] transition-colors border-b border-[var(--border)] last:border-0"
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="h-[250px] rounded-xl overflow-hidden border border-[var(--border)]">
        <MapPickerInner lat={lat} lng={lng} onSelect={handleSelect} />
      </div>
      {!readOnly && <p className="text-[10px] text-[var(--outline)]">Clique sur la carte pour placer le point de rassemblement</p>}
    </div>
  );
}
