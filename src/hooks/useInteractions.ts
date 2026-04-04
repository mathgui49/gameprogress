"use client";

import { useState, useEffect, useCallback } from "react";
import type { Interaction } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateSeedInteractions, generateSeedContacts, generateSeedMissions, generateSeedJournal, generateDefaultGamification } from "@/lib/seed";
import { generateId } from "@/lib/utils";

export function useInteractions() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const seeded = getItem<boolean>(STORAGE_KEYS.SEEDED, false);
    let data = getItem<Interaction[]>(STORAGE_KEYS.INTERACTIONS, []);

    if (!seeded && data.length === 0) {
      data = generateSeedInteractions();
      setItem(STORAGE_KEYS.INTERACTIONS, data);
      // Seed other stores too
      const contacts = generateSeedContacts(data);
      setItem(STORAGE_KEYS.CONTACTS, contacts);
      setItem(STORAGE_KEYS.MISSIONS, generateSeedMissions());
      setItem(STORAGE_KEYS.JOURNAL, generateSeedJournal());
      setItem(STORAGE_KEYS.GAMIFICATION, generateDefaultGamification());
      setItem(STORAGE_KEYS.SEEDED, true);
    }

    setInteractions(data);
    setLoaded(true);
  }, []);

  const save = useCallback((updated: Interaction[]) => {
    setInteractions(updated);
    setItem(STORAGE_KEYS.INTERACTIONS, updated);
  }, []);

  const add = useCallback(
    (input: Omit<Interaction, "id" | "createdAt">) => {
      const item: Interaction = { ...input, id: generateId(), createdAt: new Date().toISOString() };
      save([item, ...interactions]);
      return item;
    },
    [interactions, save]
  );

  const update = useCallback(
    (id: string, input: Partial<Omit<Interaction, "id" | "createdAt">>) => {
      save(interactions.map((i) => (i.id === id ? { ...i, ...input } : i)));
    },
    [interactions, save]
  );

  const remove = useCallback(
    (id: string) => { save(interactions.filter((i) => i.id !== id)); },
    [interactions, save]
  );

  const getById = useCallback(
    (id: string) => interactions.find((i) => i.id === id) ?? null,
    [interactions]
  );

  const reset = useCallback(() => {
    const data = generateSeedInteractions();
    save(data);
    setItem(STORAGE_KEYS.CONTACTS, generateSeedContacts(data));
    setItem(STORAGE_KEYS.MISSIONS, generateSeedMissions());
    setItem(STORAGE_KEYS.JOURNAL, generateSeedJournal());
    setItem(STORAGE_KEYS.GAMIFICATION, generateDefaultGamification());
  }, [save]);

  const clear = useCallback(() => { save([]); }, [save]);

  return { interactions, loaded, add, update, remove, getById, reset, clear };
}
