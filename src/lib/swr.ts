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
        if (key) setCachedData(key, serverData);
        return serverData;
      } catch {
        if (key) {
          const cached = await getCachedData<T>(key);
          if (cached) return cached;
        }
        return [];
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
      onErrorRetry: (_error, _key, _config, revalidate, { retryCount }) => {
        if (!navigator.onLine) return;
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
