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
      status: "active",
      winnerId: null,
    });
    if (id) {
      const challenge: WingChallenge = {
        id,
        createdBy: userId,
        ...input,
        currentCreator: 0,
        currentTarget: 0,
        status: "active" as const,
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

  const completeChallenge = useCallback(async (challengeId: string, winnerId: string | null) => {
    await updateWingChallengeAction(challengeId, { status: "completed", winnerId });
    setChallenges((prev) => prev.map((c) => c.id === challengeId ? { ...c, status: "completed" as const, winnerId } : c));
  }, []);

  const active = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  const getChallengesWith = useCallback(
    (otherUserId: string) => challenges.filter((c) =>
      (c.createdBy === otherUserId && c.targetUserId === userId) ||
      (c.createdBy === userId && c.targetUserId === otherUserId)
    ),
    [challenges, userId]
  );

  return { challenges, active, completed, loaded, create, updateProgress, completeChallenge, getChallengesWith };
}
