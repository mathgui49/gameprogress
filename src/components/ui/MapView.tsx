"use client";

import dynamic from "next/dynamic";

export type { MapMarker } from "./MapViewInner";

export const MapView = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-[var(--surface-high)] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /></div>,
});
