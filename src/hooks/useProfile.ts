"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { UserProfile } from "@/types";
import { fetchOne, upsertRow } from "@/lib/db";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gameObjectives: "",
  idealWoman: "",
  createdAt: new Date().toISOString(),
};

export function useProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!userId) return;
    fetchOne<UserProfile>("profiles", userId).then((data) => {
      if (data) setProfile(data);
    });
  }, [userId]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        upsertRow("profiles", userId, next);
        return next;
      });
    },
    [userId]
  );

  return { profile, updateProfile };
}
