"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { PublicProfile } from "@/types";
import { DEFAULT_PRIVACY } from "@/types";
import { fetchOneAction, upsertRowAction, searchPublicProfilesAction, findProfileByUsernameAction } from "@/actions/db";

const DEBOUNCE_MS = 800;

export function usePublicProfile() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const googleImage = session?.user?.image ?? null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<PublicProfile | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchOneAction<PublicProfile>("public_profiles").then((data) => {
      // Auto-set Google profile photo as default if no custom photo exists
      if (data && !data.profilePhoto && googleImage) {
        const updated = { ...data, profilePhoto: googleImage };
        setProfile(updated);
        latestRef.current = updated;
        upsertRowAction("public_profiles", updated);
      } else {
        setProfile(data);
        latestRef.current = data;
      }
      setLoaded(true);
    });
  }, [userId, googleImage]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (latestRef.current) upsertRowAction("public_profiles", latestRef.current);
      }
    };
  }, []);

  const save = useCallback(
    (updates: Partial<Omit<PublicProfile, "userId" | "createdAt">>, immediate?: boolean) => {
      setProfile((prev) => {
        const next: PublicProfile = {
          userId,
          username: prev?.username ?? "",
          firstName: prev?.firstName ?? "",
          birthDate: prev?.birthDate ?? null,
          profilePhoto: prev?.profilePhoto ?? null,
          location: prev?.location ?? "",
          lat: prev?.lat ?? null,
          lng: prev?.lng ?? null,
          bio: prev?.bio ?? "",
          isPublic: prev?.isPublic ?? false,
          privacy: prev?.privacy ?? DEFAULT_PRIVACY,
          createdAt: prev?.createdAt ?? new Date().toISOString(),
          ...updates,
        };
        latestRef.current = next;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (immediate) {
          setSaving(true);
          upsertRowAction("public_profiles", next).finally(() => setSaving(false));
        } else {
          setSaving(true);
          debounceRef.current = setTimeout(() => {
            upsertRowAction("public_profiles", latestRef.current!).finally(() => setSaving(false));
            debounceRef.current = null;
          }, DEBOUNCE_MS);
        }

        return next;
      });
    },
    [userId]
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

  const isProfileComplete = !!(profile?.firstName?.trim() && profile?.username?.trim());

  return { profile, loaded, saving, save, isProfileComplete, discoverProfiles, findByUsername };
}
