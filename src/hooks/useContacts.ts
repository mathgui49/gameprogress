"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Contact, ContactStatus, ContactEvent, Reminder, ArchiveReason, ArchiveInfo } from "@/types";
import { fetchAll, insertRow, updateRow, deleteRow } from "@/lib/db";
import { generateId } from "@/lib/utils";

export function useContacts() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAll<Contact>("contacts", userId).then((data) => {
      setContacts(data);
      setLoaded(true);
    });
  }, [userId]);

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
      setContacts((prev) => [item, ...prev]);
      insertRow("contacts", userId, item);
      return item;
    },
    [userId]
  );

  const updateStatus = useCallback(
    (id: string, status: ContactStatus) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Statut change vers "${status}"` };
          const updated = { ...c, status, timeline: [...c.timeline, event] };
          updateRow("contacts", id, { status, timeline: updated.timeline });
          return updated;
        })
      );
    },
    []
  );

  const addNote = useCallback(
    (id: string, content: string) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const event: ContactEvent = { id: generateId(), type: "note", date: new Date().toISOString(), content };
          const updated = { ...c, notes: content, timeline: [...c.timeline, event] };
          updateRow("contacts", id, { notes: content, timeline: updated.timeline });
          return updated;
        })
      );
    },
    []
  );

  const addReminder = useCallback(
    (contactId: string, label: string, date: string) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== contactId) return c;
          const reminder: Reminder = { id: generateId(), contactId, label, date, done: false };
          const event: ContactEvent = { id: generateId(), type: "reminder", date: new Date().toISOString(), content: `Rappel: ${label}` };
          const updated = { ...c, reminders: [...c.reminders, reminder], timeline: [...c.timeline, event] };
          updateRow("contacts", contactId, { reminders: updated.reminders, timeline: updated.timeline });
          return updated;
        })
      );
    },
    []
  );

  const toggleReminder = useCallback(
    (contactId: string, reminderId: string) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== contactId) return c;
          const reminders = c.reminders.map((r) => (r.id === reminderId ? { ...r, done: !r.done } : r));
          updateRow("contacts", contactId, { reminders });
          return { ...c, reminders };
        })
      );
    },
    []
  );

  const updateTags = useCallback(
    (id: string, tags: string[]) => {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, tags } : c)));
      updateRow("contacts", id, { tags });
    },
    []
  );

  const archive = useCallback(
    (id: string, reason: ArchiveReason, customReason?: string) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const archiveInfo: ArchiveInfo = { reason, customReason, date: new Date().toISOString() };
          const label = customReason || reason;
          const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Archive — ${label}` };
          const updated = { ...c, status: "archived" as ContactStatus, archiveInfo, timeline: [...c.timeline, event] };
          updateRow("contacts", id, { status: "archived", archiveInfo, timeline: updated.timeline });
          return updated;
        })
      );
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      deleteRow("contacts", id);
    },
    []
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
