"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { PublicProfile } from "@/types";
import { fetchOne, upsertRow, searchPublicProfiles, findProfileByUsername } from "@/lib/db";

export function usePublicProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchOne<PublicProfile>("public_profiles", userId).then((data) => {
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
        location: profile?.location ?? "",
        bio: profile?.bio ?? "",
        isPublic: profile?.isPublic ?? false,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
        ...updates,
      };
      setProfile(next);
      upsertRow("public_profiles", userId, next);
    },
    [userId, profile]
  );

  const discoverProfiles = useCallback(
    async (location?: string): Promise<PublicProfile[]> => {
      const results = await searchPublicProfiles(location);
      return results.filter((p: PublicProfile) => p.userId !== userId);
    },
    [userId]
  );

  const findByUsername = useCallback(
    async (username: string): Promise<PublicProfile | null> => {
      return findProfileByUsername(username);
    },
    []
  );

  return { profile, loaded, save, discoverProfiles, findByUsername };
}
