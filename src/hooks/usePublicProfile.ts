"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { PublicProfile } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { fetchOneAction, upsertRowAction, searchPublicProfilesAction, findProfileByUsernameAction } from "@/actions/db";

export function usePublicProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchOneAction<PublicProfile>("public_profiles").then((data) => {
      setProfile(data);
      setLoaded(true);
    });
  }, [userId]);

  const save = useCallback(
    (updates: Partial<Omit<PublicProfile, "userId" | "createdAt">>) => {
      const next: PublicProfile = {
        userId,
        username: profile?.username ?? "",
        firstName: profile?.firstName ?? "",
        birthDate: profile?.birthDate ?? null,
        profilePhoto: profile?.profilePhoto ?? null,
        location: profile?.location ?? "",
        lat: profile?.lat ?? null,
        lng: profile?.lng ?? null,
        bio: profile?.bio ?? "",
        isPublic: profile?.isPublic ?? false,
        privacy: profile?.privacy ?? DEFAULT_PRIVACY,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
        ...updates,
      };
      setProfile(next);
      upsertRowAction("public_profiles", next);
    },
    [userId, profile]
  );

  const discoverProfiles = useCallback(
    async (location?: string): Promise<PublicProfile[]> => {
      const results = await searchPublicProfilesAction(location);
      return results.filter((p: PublicProfile) => p.userId !== userId);
    },
    [userId]
  );

  const findByUsername = useCallback(
    async (username: string): Promise<PublicProfile | null> => {
      return findProfileByUsernameAction(username);
    },
    []
  );

  return { profile, loaded, save, discoverProfiles, findByUsername };
}
