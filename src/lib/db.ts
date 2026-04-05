import { supabase } from "./supabase";

// camelCase → snake_case
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// snake_case → camelCase
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function toRow(obj: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) row[toSnake(k)] = v;
  return row;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) obj[toCamel(k)] = v;
  return obj as T;
}

// Generic CRUD helpers

export async function fetchAll<T>(table: string, userId: string, orderBy = "created_at"): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order(orderBy, { ascending: false });
  if (error) { console.error(`fetch ${table}:`, error); return []; }
  return (data || []).map((r) => fromRow<T>(r));
}

export async function fetchOne<T>(table: string, userId: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return fromRow<T>(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertRow(table: string, userId: string, obj: any) {
  const row = toRow(obj);
  row.user_id = userId;
  const { error } = await supabase.from(table).insert(row);
  if (error) console.error(`insert ${table}:`, error);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRow(table: string, id: string, obj: any) {
  const row = toRow(obj);
  delete row.id;
  delete row.user_id;
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) console.error(`update ${table}:`, error);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertRow(table: string, userId: string, obj: any) {
  const row = toRow(obj);
  row.user_id = userId;
  const { error } = await supabase.from(table).upsert(row);
  if (error) console.error(`upsert ${table}:`, error);
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`delete ${table}:`, error);
}
