"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Contact, ContactStatus, ContactEvent, Reminder, ArchiveReason, ArchiveInfo } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";

export function useContacts() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: contacts, loaded } = useSwrFetch<Contact>("contacts", userId);

  const add = useCallback(
    async (input: Omit<Contact, "id" | "createdAt" | "timeline" | "reminders" | "lastInteractionDate">) => {
      const item: Contact = {
        ...input,
        id: generateId(),
        timeline: [{ id: generateId(), type: "interaction", date: new Date().toISOString(), content: "Contact créé" }],
        reminders: [],
        createdAt: new Date().toISOString(),
        lastInteractionDate: new Date().toISOString(),
      };
      await insertRowAction("contacts", item);
      await mutateTable("contacts", userId);
      return item;
    },
    [userId]
  );

  const updateStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Statut changé vers "${status}"` };
      await updateRowAction("contacts", id, { status, timeline: [...contact.timeline, event] });
      await mutateTable("contacts", userId);
    },
    [contacts, userId]
  );

  const addNote = useCallback(
    async (id: string, content: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const event: ContactEvent = { id: generateId(), type: "note", date: new Date().toISOString(), content };
      await updateRowAction("contacts", id, { notes: content, timeline: [...contact.timeline, event] });
      await mutateTable("contacts", userId);
    },
    [contacts, userId]
  );

  const addReminder = useCallback(
    async (contactId: string, label: string, date: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const reminder: Reminder = { id: generateId(), contactId, label, date, done: false };
      const event: ContactEvent = { id: generateId(), type: "reminder", date: new Date().toISOString(), content: `Rappel: ${label}` };
      await updateRowAction("contacts", contactId, { reminders: [...contact.reminders, reminder], timeline: [...contact.timeline, event] });
      await mutateTable("contacts", userId);
    },
    [contacts, userId]
  );

  const toggleReminder = useCallback(
    async (contactId: string, reminderId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const reminders = contact.reminders.map((r) => (r.id === reminderId ? { ...r, done: !r.done } : r));
      await updateRowAction("contacts", contactId, { reminders });
      await mutateTable("contacts", userId);
    },
    [contacts, userId]
  );

  const updateTags = useCallback(
    async (id: string, tags: string[]) => {
      await updateRowAction("contacts", id, { tags });
      await mutateTable("contacts", userId);
    },
    [userId]
  );

  const archive = useCallback(
    async (id: string, reason: ArchiveReason, customReason?: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const archiveInfo: ArchiveInfo = { reason, customReason, date: new Date().toISOString() };
      const label = customReason || reason;
      const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Archivé — ${label}` };
      await updateRowAction("contacts", id, { status: "archived", archiveInfo, timeline: [...contact.timeline, event] });
      await mutateTable("contacts", userId);
    },
    [contacts, userId]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRowAction("contacts", id);
      await mutateTable("contacts", userId);
    },
    [userId]
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
