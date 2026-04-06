"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { UserProfile } from "@/types";
import { fetchOneAction, upsertRowAction } from "@/actions/db";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gameObjectives: "",
  idealWoman: "",
  createdAt: new Date().toISOString(),
};

const DEBOUNCE_MS = 800;

export function useProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!userId) return;
    fetchOneAction<UserProfile>("profiles").then((data) => {
      if (data) {
        setProfile(data);
        latestRef.current = data;
      }
    });
  }, [userId]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        upsertRowAction("profiles", latestRef.current);
      }
    };
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        latestRef.current = next;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSaving(true);
        debounceRef.current = setTimeout(() => {
          upsertRowAction("profiles", latestRef.current).finally(() => setSaving(false));
          debounceRef.current = null;
        }, DEBOUNCE_MS);

        return next;
      });
    },
    [userId]
  );

  return { profile, updateProfile, saving };
}
