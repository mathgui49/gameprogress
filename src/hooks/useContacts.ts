"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactStatus, ContactEvent, Reminder, ArchiveReason, ArchiveInfo } from "@/types";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setContacts(getItem<Contact[]>(STORAGE_KEYS.CONTACTS, []));
    setLoaded(true);
  }, []);

  const save = useCallback((updated: Contact[]) => {
    setContacts(updated);
    setItem(STORAGE_KEYS.CONTACTS, updated);
  }, []);

  const add = useCallback(
    (input: Omit<Contact, "id" | "createdAt" | "timeline" | "reminders" | "lastInteractionDate">) => {
      const item: Contact = {
        ...input,
        id: generateId(),
        timeline: [{ id: generateId(), type: "interaction", date: new Date().toISOString(), content: "Contact cree" }],
        reminders: [],
        createdAt: new Date().toISOString(),
        lastInteractionDate: new Date().toISOString(),
      };
      save([item, ...contacts]);
      return item;
    },
    [contacts, save]
  );

  const updateStatus = useCallback(
    (id: string, status: ContactStatus) => {
      save(
        contacts.map((c) => {
          if (c.id !== id) return c;
          const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Statut change vers "${status}"` };
          return { ...c, status, timeline: [...c.timeline, event] };
        })
      );
    },
    [contacts, save]
  );

  const addNote = useCallback(
    (id: string, content: string) => {
      save(
        contacts.map((c) => {
          if (c.id !== id) return c;
          const event: ContactEvent = { id: generateId(), type: "note", date: new Date().toISOString(), content };
          return { ...c, notes: content, timeline: [...c.timeline, event] };
        })
      );
    },
    [contacts, save]
  );

  const addReminder = useCallback(
    (contactId: string, label: string, date: string) => {
      save(
        contacts.map((c) => {
          if (c.id !== contactId) return c;
          const reminder: Reminder = { id: generateId(), contactId, label, date, done: false };
          const event: ContactEvent = { id: generateId(), type: "reminder", date: new Date().toISOString(), content: `Rappel: ${label}` };
          return { ...c, reminders: [...c.reminders, reminder], timeline: [...c.timeline, event] };
        })
      );
    },
    [contacts, save]
  );

  const toggleReminder = useCallback(
    (contactId: string, reminderId: string) => {
      save(
        contacts.map((c) => {
          if (c.id !== contactId) return c;
          return { ...c, reminders: c.reminders.map((r) => (r.id === reminderId ? { ...r, done: !r.done } : r)) };
        })
      );
    },
    [contacts, save]
  );

  const updateTags = useCallback(
    (id: string, tags: string[]) => {
      save(contacts.map((c) => (c.id === id ? { ...c, tags } : c)));
    },
    [contacts, save]
  );

  const archive = useCallback(
    (id: string, reason: ArchiveReason, customReason?: string) => {
      save(
        contacts.map((c) => {
          if (c.id !== id) return c;
          const archiveInfo: ArchiveInfo = { reason, customReason, date: new Date().toISOString() };
          const label = customReason || reason;
          const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Archive — ${label}` };
          return { ...c, status: "archived" as ContactStatus, archiveInfo, timeline: [...c.timeline, event] };
        })
      );
    },
    [contacts, save]
  );

  const remove = useCallback(
    (id: string) => { save(contacts.filter((c) => c.id !== id)); },
    [contacts, save]
  );

  const getById = useCallback(
    (id: string) => contacts.find((c) => c.id === id) ?? null,
    [contacts]
  );

  const getByStatus = useCallback(
    (status: ContactStatus) => contacts.filter((c) => c.status === status),
    [contacts]
  );

  const allReminders = contacts.flatMap((c) => c.reminders.filter((r) => !r.done).map((r) => ({ ...r, contactName: c.firstName })));

  return { contacts, loaded, add, updateStatus, archive, addNote, addReminder, toggleReminder, updateTags, remove, getById, getByStatus, allReminders };
}
