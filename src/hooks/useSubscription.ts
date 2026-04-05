"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import type { Subscription } from "@/lib/db";

async function fetcher(url: string): Promise<Subscription | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export function useSubscription() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";

  // No longer pass userId as query param — the server reads it from the session
  const { data: subscription, isLoading, mutate } = useSWR(
    userId ? `/api/stripe/status` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const isPremium = subscription?.status === "active";

  const checkout = async () => {
    // Server reads userId from session — no need to send it
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const openPortal = async () => {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return { subscription, isPremium, loaded: !isLoading, checkout, openPortal, refresh: mutate };
}
