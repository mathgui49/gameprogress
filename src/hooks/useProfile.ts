"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  gameObjectives: "",
  idealWoman: "",
  createdAt: new Date().toISOString(),
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfile(getItem(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE));
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      setItem(STORAGE_KEYS.PROFILE, next);
      return next;
    });
  }, []);

  return { profile, updateProfile };
}
