"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WingPing } from "@/types";
import { createWingPingAction, fetchRecentPingsAction, respondToPingAction } from "@/actions/db";

export function useWingPings(wingUserIds: string[]) {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [pings, setPings] = useState<WingPing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId || wingUserIds.length === 0) { setLoaded(true); return; }
    fetchRecentPingsAction([...wingUserIds, userId]).then((data) => {
      setPings(data);
      setLoaded(true);
    });
  }, [userId, wingUserIds.length]);

  const sendPing = useCallback(async (message: string, location: string, date: string) => {
    const id = await createWingPingAction(message, location, date);
    if (id) {
      const ping: WingPing = {
        id,
        fromUserId: userId,
        message,
        location,
        date,
        createdAt: new Date().toISOString(),
        respondedIds: [],
      };
      setPings((prev) => [ping, ...prev]);
    }
    return id;
  }, [userId]);

  const respond = useCallback(async (pingId: string) => {
    await respondToPingAction(pingId);
    setPings((prev) => prev.map((p) =>
      p.id === pingId ? { ...p, respondedIds: [...p.respondedIds, userId] } : p
    ));
  }, [userId]);

  return { pings, loaded, sendPing, respond };
}
