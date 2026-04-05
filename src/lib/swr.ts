"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { fetchAllAction } from "@/actions/db";
import { getCachedData, setCachedData } from "@/lib/offlineDb";

export function useSwrFetch<T>(table: string, userId: string) {
  const key = userId ? `${table}:${userId}` : null;
  const { data, isLoading } = useSWR(
    key,
    async () => {
      try {
        const serverData = await fetchAllAction<T>(table);
        // Persist to IndexedDB for offline use
        if (key) setCachedData(key, serverData);
        return serverData;
      } catch {
        // Network error — fall back to IndexedDB cache
        if (key) {
          const cached = await getCachedData<T>(key);
          if (cached) return cached;
        }
        return [];
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      // Use IndexedDB as fallback data provider
      fallbackData: undefined,
      onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
        // Don't retry if offline
        if (!navigator.onLine) return;
        // Retry up to 3 times with backoff
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000 * (retryCount + 1));
      },
    }
  );
  return { data: data ?? [], loaded: !isLoading && !!userId, key };
}

export function mutateTable(table: string, userId: string) {
  return globalMutate(`${table}:${userId}`);
}
