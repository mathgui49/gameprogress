"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { fetchAllAction } from "@/actions/db";

export function useSwrFetch<T>(table: string, userId: string) {
  const key = userId ? `${table}:${userId}` : null;
  const { data, isLoading } = useSWR(key, () => fetchAllAction<T>(table), {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  return { data: data ?? [], loaded: !isLoading && !!userId, key };
}

export function mutateTable(table: string, userId: string) {
  return globalMutate(`${table}:${userId}`);
}
