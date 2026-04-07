"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { WingChallenge } from "@/types";
import { fetchWingChallengesAction, createWingChallengeAction, updateWingChallengeAction } from "@/actions/db";

export function useWingChallenges() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [challenges, setChallenges] = useState<WingChallenge[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchWingChallengesAction().then((data) => {
      setChallenges(data);
      setLoaded(true);
    });
  }, [userId]);

  const create = useCallback(async (input: {
    targetUserId: string;
    title: string;
    description: string;
    target: number;
    metric: string;
    deadline: string;
  }) => {
    const id = await createWingChallengeAction({
      ...input,
      currentCreator: 0,
      currentTarget: 0,
      status: "pending",
      winnerId: null,
    });
    if (id) {
      const challenge: WingChallenge = {
        id,
        createdBy: userId,
        ...input,
        currentCreator: 0,
        currentTarget: 0,
        status: "pending" as const,
        winnerId: null,
        createdAt: new Date().toISOString(),
      } as WingChallenge;
      setChallenges((prev) => [challenge, ...prev]);
    }
    return id;
  }, [userId]);

  const updateProgress = useCallback(async (challengeId: string, field: "currentCreator" | "currentTarget", value: number) => {
    await updateWingChallengeAction(challengeId, { [field]: value });
    setChallenges((prev) => prev.map((c) => {
      if (c.id !== challengeId) return c;
      const updated = { ...c, [field]: value };
      // Auto-complete if both reached target
      if (updated.currentCreator >= updated.target && updated.currentTarget >= updated.target) {
        updated.status = "completed";
      }
      return updated;
    }));
  }, []);

  const acceptChallenge = useCallback(async (challengeId: string) => {
    await updateWingChallengeAction(challengeId, { status: "active" });
    setChallenges((prev) => prev.map((c) => c.id === challengeId ? { ...c, status: "active" as const } : c));
  }, []);

  const declineChallenge = useCallback(async (challengeId: string) => {
    await updateWingChallengeAction(challengeId, { status: "declined" });
    setChallenges((prev) => prev.map((c) => c.id === challengeId ? { ...c, status: "declined" as const } : c));
  }, []);

  const completeChallenge = useCallback(async (challengeId: string, winnerId: string | null) => {
    await updateWingChallengeAction(challengeId, { status: "completed", winnerId });
    setChallenges((prev) => prev.map((c) => c.id === challengeId ? { ...c, status: "completed" as const, winnerId } : c));
  }, []);

  const pending = challenges.filter((c) => c.status === "pending");
  const active = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  const getChallengesWith = useCallback(
    (otherUserId: string) => challenges.filter((c) =>
      (c.createdBy === otherUserId && c.targetUserId === userId) ||
      (c.createdBy === userId && c.targetUserId === otherUserId)
    ),
    [challenges, userId]
  );

  const pendingReceived = pending.filter((c) => c.targetUserId === userId);

  return { challenges, pending, pendingReceived, active, completed, loaded, create, acceptChallenge, declineChallenge, updateProgress, completeChallenge, getChallengesWith };
}
