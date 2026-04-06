"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  hideMap?: boolean;
  initialSearch?: string;
}

export function MapPicker({ lat, lng, address, onAddressChange, onCoordsChange, label, readOnly, hideMap, initialSearch }: MapPickerProps) {
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialSearchDone = useRef(false);

  const searchAddress = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`, {
        headers: { "Accept-Language": "fr" },
      });
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search on mount when initialSearch is provided
  useEffect(() => {
    if (initialSearch && !initialSearchDone.current) {
      initialSearchDone.current = true;
      searchAddress(initialSearch);
    }
  }, [initialSearch, searchAddress]);

  const reverseGeocode = useCallback(async (newLat: number, newLng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&accept-language=fr`);
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
    debounceRef.current = setTimeout(() => searchAddress(value), 400);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    // Extract a shorter display name (city, country) instead of the full Nominatim string
    const parts = suggestion.display_name.split(",").map((s) => s.trim());
    const short = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 2]}` : suggestion.display_name;
    onAddressChange(short);
    onCoordsChange(parseFloat(suggestion.lat), parseFloat(suggestion.lon));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const showMap = !hideMap && !readOnly || (readOnly && lat !== 48.8566);

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1">{label}</label>}
      {!readOnly && (
        <div className="relative">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Rechercher une ville ou adresse..."
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--surface-high)] border border-[var(--border)] text-sm text-[var(--on-surface)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--primary)]/30 transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
            )}
            {!searching && address && (
              <button
                type="button"
                onClick={() => { onAddressChange(""); setSuggestions([]); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-surface)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden glass-card shadow-xl border border-[var(--border)]">
              {suggestions.map((s, i) => {
                const parts = s.display_name.split(",").map((p) => p.trim());
                const main = parts[0];
                const sub = parts.slice(1, 3).join(", ");
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-bright)] transition-colors border-b border-[var(--border)] last:border-0 flex items-start gap-2"
                  >
                    <svg className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-[var(--on-surface)]">{main}</p>
                      {sub && <p className="text-[10px] text-[var(--outline)]">{sub}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {showMap && (
        <>
          <div className="h-[250px] rounded-xl overflow-hidden border border-[var(--border)]">
            <MapPickerInner lat={lat} lng={lng} onSelect={handleSelect} />
          </div>
          {!readOnly && <p className="text-[10px] text-[var(--outline)]">Clique sur la carte pour placer le point</p>}
        </>
      )}
    </div>
  );
}
