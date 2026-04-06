"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { UserProfile } from "@/types";
import { fetchOneAction, upsertRowAction } from "@/actions/db";

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
    fetchOneAction<UserProfile>("profiles").then((data) => {
      if (data) setProfile(data);
    });
  }, [userId]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        upsertRowAction("profiles", next);
        return next;
      });
    },
    [userId]
  );

  return { profile, updateProfile };
}
