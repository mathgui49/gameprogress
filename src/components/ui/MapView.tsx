"use client";

import dynamic from "next/dynamic";

export type { MapMarker } from "./MapViewInner";

export const MapView = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-[#1a1626] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#c084fc]/30 border-t-[#c084fc] rounded-full animate-spin" /></div>,
});
