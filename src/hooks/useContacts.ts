"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Contact, ContactStatus, ContactEvent, Reminder, ArchiveReason, ArchiveInfo } from "@/types";
import { insertRowAction, updateRowAction, deleteRowAction } from "@/actions/db";
import { useSwrFetch, mutateTable } from "@/lib/swr";
import { generateId } from "@/lib/utils";
import { addToSyncQueue, applyCacheUpdate } from "@/lib/offlineDb";

export function useContacts() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const { data: contacts, loaded, key } = useSwrFetch<Contact>("contacts", userId);

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

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "insert", item);
        await addToSyncQueue({ action: "insert", table: "contacts", payload: item });
        await mutateTable("contacts", userId);
        return item;
      }

      await insertRowAction("contacts", item);
      await mutateTable("contacts", userId);
      return item;
    },
    [userId, key]
  );

  const updateStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Statut changé vers "${status}"` };
      const payload = { status, timeline: [...contact.timeline, event] };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...contact, ...payload });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: id, payload });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", id, payload);
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const addNote = useCallback(
    async (id: string, content: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const event: ContactEvent = { id: generateId(), type: "note", date: new Date().toISOString(), content };
      const payload = { notes: content, timeline: [...contact.timeline, event] };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...contact, ...payload });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: id, payload });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", id, payload);
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const addReminder = useCallback(
    async (contactId: string, label: string, date: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const reminder: Reminder = { id: generateId(), contactId, label, date, done: false };
      const event: ContactEvent = { id: generateId(), type: "reminder", date: new Date().toISOString(), content: `Rappel: ${label}` };
      const payload = { reminders: [...contact.reminders, reminder], timeline: [...contact.timeline, event] };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...contact, ...payload });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: contactId, payload });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", contactId, payload);
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const toggleReminder = useCallback(
    async (contactId: string, reminderId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const reminders = contact.reminders.map((r) => (r.id === reminderId ? { ...r, done: !r.done } : r));
      const payload = { reminders };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...contact, ...payload });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: contactId, payload });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", contactId, payload);
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const updateTags = useCallback(
    async (id: string, tags: string[]) => {
      if (!navigator.onLine) {
        const contact = contacts.find((c) => c.id === id);
        if (contact && key) await applyCacheUpdate(key, "update", { ...contact, tags });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: id, payload: { tags } });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", id, { tags });
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const archive = useCallback(
    async (id: string, reason: ArchiveReason, customReason?: string) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact) return;
      const archiveInfo: ArchiveInfo = { reason, customReason, date: new Date().toISOString() };
      const label = customReason || reason;
      const event: ContactEvent = { id: generateId(), type: "status_change", date: new Date().toISOString(), content: `Archivé — ${label}` };
      const payload = { status: "archived" as ContactStatus, archiveInfo, timeline: [...contact.timeline, event] };

      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "update", { ...contact, ...payload });
        await addToSyncQueue({ action: "update", table: "contacts", rowId: id, payload });
        await mutateTable("contacts", userId);
        return;
      }

      await updateRowAction("contacts", id, payload);
      await mutateTable("contacts", userId);
    },
    [contacts, userId, key]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!navigator.onLine) {
        if (key) await applyCacheUpdate(key, "delete", { id } as Contact);
        await addToSyncQueue({ action: "delete", table: "contacts", rowId: id, payload: {} });
        await mutateTable("contacts", userId);
        return;
      }

      await deleteRowAction("contacts", id);
      await mutateTable("contacts", userId);
    },
    [userId, key]
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
