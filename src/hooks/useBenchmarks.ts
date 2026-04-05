"use client";

import useSWR from "swr";
import { fetchCommunityBenchmarksAction } from "@/actions/db";
import type { CommunityBenchmarks } from "@/lib/db";

export function useBenchmarks() {
  const { data, isLoading } = useSWR(
    "community-benchmarks",
    () => fetchCommunityBenchmarksAction(),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return {
    benchmarks: data ?? null,
    loaded: !isLoading,
  };
}

/** Returns a comparison label like "+12%" or "-5%" */
export function compareStat(userVal: number, communityVal: number): { label: string; positive: boolean } {
  if (communityVal === 0) return { label: "—", positive: true };
  const diff = userVal - communityVal;
  const pct = Math.round((diff / communityVal) * 100);
  return {
    label: pct >= 0 ? `+${pct}%` : `${pct}%`,
    positive: pct >= 0,
  };
}
