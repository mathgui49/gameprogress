"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WingRequest, PublicProfile, Session } from "@/types";
import {
  fetchWingRequestsAction, sendWingRequestAction, acceptWingRequestAction,
  declineWingRequestAction, fetchProfilesByIdsAction, fetchSessionsByUserIdAction,
} from "@/actions/db";

export function useWingRequests() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [sent, setSent] = useState<WingRequest[]>([]);
  const [received, setReceived] = useState<WingRequest[]>([]);
  const [wingProfiles, setWingProfiles] = useState<PublicProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    const data = await fetchWingRequestsAction();
    setSent(data.sent);
    setReceived(data.received);

    const acceptedIds = [
      ...data.sent.filter((r: WingRequest) => r.status === "accepted").map((r: WingRequest) => r.toUserId),
      ...data.received.filter((r: WingRequest) => r.status === "accepted").map((r: WingRequest) => r.fromUserId),
    ];
    if (acceptedIds.length > 0) {
      const profiles = await fetchProfilesByIdsAction(acceptedIds);
      setWingProfiles(profiles);
    }
    setLoaded(true);
  }, [userId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const sendRequest = useCallback(
    async (toUserId: string) => {
      if (toUserId === userId) return;
      const alreadySent = sent.some((r) => r.toUserId === toUserId && r.status === "pending");
      const alreadyAccepted = sent.some((r) => r.toUserId === toUserId && r.status === "accepted")
        || received.some((r) => r.fromUserId === toUserId && r.status === "accepted");
      if (alreadySent || alreadyAccepted) return;

      const request: WingRequest = {
        id: crypto.randomUUID(),
        fromUserId: userId,
        toUserId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setSent((prev) => [request, ...prev]);
      await sendWingRequestAction(toUserId);
    },
    [userId, sent, received]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      await acceptWingRequestAction(requestId);
      setReceived((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "accepted" as const } : r)));
      loadRequests();
    },
    [loadRequests]
  );

  const declineRequest = useCallback(
    async (requestId: string) => {
      await declineWingRequestAction(requestId);
      setReceived((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "declined" as const } : r)));
    },
    []
  );

  const getWingSessions = useCallback(
    async (wingUserId: string): Promise<Session[]> => {
      return fetchSessionsByUserIdAction(wingUserId);
    },
    []
  );

  const pendingReceived = received.filter((r) => r.status === "pending");
  const pendingSent = sent.filter((r) => r.status === "pending");

  const isWing = useCallback(
    (otherUserId: string) => {
      return sent.some((r) => r.toUserId === otherUserId && r.status === "accepted")
        || received.some((r) => r.fromUserId === otherUserId && r.status === "accepted");
    },
    [sent, received]
  );

  const hasPendingTo = useCallback(
    (otherUserId: string) => {
      return sent.some((r) => r.toUserId === otherUserId && r.status === "pending");
    },
    [sent]
  );

  return {
    sent, received, wingProfiles, loaded,
    sendRequest, acceptRequest, declineRequest,
    getWingSessions, pendingReceived, pendingSent,
    isWing, hasPendingTo,
  };
}
