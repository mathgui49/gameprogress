"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { UserProfile } from "@/types";
import { fetchOneAction, upsertRowAction, claimReferralAction } from "@/actions/db";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  gameObjectives: "",
  idealWoman: "",
  createdAt: new Date().toISOString(),
};

export function useProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const googleName = session?.user?.name ?? "";
  const googleEmail = session?.user?.email ?? "";
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchOneAction<UserProfile>("profiles").then((data) => {
      if (data) {
        // Auto-fill name/email from Google if empty
        const updates: Partial<UserProfile> = {};
        if (!data.name && googleName) updates.name = googleName;
        if (!data.email && googleEmail) updates.email = googleEmail;
        if (Object.keys(updates).length > 0) {
          const merged = { ...data, ...updates };
          setProfile(merged);
          upsertRowAction("profiles", merged);
        } else {
          setProfile(data);
        }
      } else {
        // First time: create profile with Google data
        const initial: UserProfile = {
          ...DEFAULT_PROFILE,
          name: googleName,
          email: googleEmail,
          createdAt: new Date().toISOString(),
        };
        setProfile(initial);
        upsertRowAction("profiles", initial);

        // Process referral if one was saved before OAuth
        try {
          const refCode = localStorage.getItem("gp_referral_code");
          if (refCode) {
            localStorage.removeItem("gp_referral_code");
            claimReferralAction(refCode).catch(() => {});
          }
        } catch {}
      }
      setLoaded(true);
    });
  }, [userId, googleName, googleEmail]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const next = { ...profile, ...updates };
      setProfile(next);
      try {
        await upsertRowAction("profiles", next);
      } catch (err) {
        console.error("Failed to save profile:", err);
      }
    },
    [profile]
  );

  return { profile, loaded, updateProfile };
}
