import { supabase } from "./supabase";

// camelCase → snake_case
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// snake_case → camelCase
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRow(obj: any): Record<string, unknown> {
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

// Custom queries for social features

export async function searchPublicProfiles(location?: string) {
  let query = supabase.from("public_profiles").select("*").eq("is_public", true);
  if (location) query = query.ilike("location", `%${location}%`);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) { console.error("search profiles:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function findProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (error || !data) return null;
  return fromRow<any>(data);
}

export async function fetchWingRequests(userId: string) {
  const { data: sent, error: e1 } = await supabase
    .from("wing_requests")
    .select("*")
    .eq("from_user_id", userId)
    .order("created_at", { ascending: false });
  const { data: received, error: e2 } = await supabase
    .from("wing_requests")
    .select("*")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false });
  if (e1) console.error("fetch sent requests:", e1);
  if (e2) console.error("fetch received requests:", e2);
  return {
    sent: (sent || []).map((r) => fromRow<any>(r)),
    received: (received || []).map((r) => fromRow<any>(r)),
  };
}

export async function updateWingRequestStatus(requestId: string, status: string) {
  const { error } = await supabase
    .from("wing_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) console.error("update request:", error);
}

export async function fetchProfilesByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .in("user_id", userIds);
  if (error) { console.error("fetch profiles by ids:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchSessionsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetch sessions:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

// ─── Public sessions ────────────────────────────────────

export async function fetchPublicSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("is_public", true)
    .order("date", { ascending: false })
    .limit(50);
  if (error) { console.error("fetch public sessions:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchSessionParticipants(sessionId: string) {
  const { data, error } = await supabase
    .from("session_participants")
    .select("*")
    .eq("session_id", sessionId);
  if (error) { console.error("fetch participants:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchMySessionRequests(userId: string) {
  const { data, error } = await supabase
    .from("session_participants")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("status", "pending");
  if (error) { console.error("fetch session requests:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

// ─── Likes & comments ───────────────────────────────────

export async function fetchSessionLikes(sessionId: string) {
  const { data, error } = await supabase
    .from("session_likes")
    .select("*")
    .eq("session_id", sessionId);
  if (error) return [];
  return (data || []).map((r) => fromRow<any>(r));
}

export async function toggleSessionLike(sessionId: string, userId: string) {
  const { data } = await supabase
    .from("session_likes")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();
  if (data) {
    await supabase.from("session_likes").delete().eq("id", data.id);
    return false;
  } else {
    await supabase.from("session_likes").insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      user_id: userId,
    });
    return true;
  }
}

export async function fetchSessionComments(sessionId: string) {
  const { data, error } = await supabase
    .from("session_comments")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data || []).map((r) => fromRow<any>(r));
}

export async function addSessionComment(sessionId: string, userId: string, content: string) {
  await supabase.from("session_comments").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    user_id: userId,
    content,
  });
}

// ─── Leaderboard ────────────────────────────────────────

export async function fetchLeaderboard(location?: string) {
  // Get all public profiles
  let query = supabase.from("public_profiles").select("*").eq("is_public", true);
  if (location) query = query.ilike("location", `%${location}%`);
  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p: any) => p.user_id);
  const { data: gamData } = await supabase
    .from("gamification")
    .select("*")
    .in("user_id", userIds);

  return profiles.map((p: any) => {
    const gam = (gamData || []).find((g: any) => g.user_id === p.user_id);
    return {
      ...fromRow<any>(p),
      xp: gam?.xp ?? 0,
      level: gam?.level ?? 1,
      streak: gam?.streak ?? 0,
    };
  }).sort((a: any, b: any) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp));
}

// ─── Feed ───────────────────────────────────────────────

export async function fetchActivityFeed(userId: string, wingIds: string[], location?: string) {
  // 1. Fetch public sessions
  const { data: sessions } = await supabase.from("sessions").select("*").eq("is_public", true)
    .order("created_at", { ascending: false }).limit(20);

  // 2. Fetch visible journal entries: public for everyone + wings for my wings
  const { data: publicJournal } = await supabase.from("journal_entries").select("*")
    .eq("visibility", "public").neq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);

  let wingsJournal: any[] = [];
  if (wingIds.length > 0) {
    const { data } = await supabase.from("journal_entries").select("*")
      .eq("visibility", "wings").in("user_id", wingIds)
      .order("created_at", { ascending: false }).limit(20);
    wingsJournal = data || [];
  }

  // 3. Fetch visible posts: public for everyone + wings for my wings
  const { data: publicPosts } = await supabase.from("posts").select("*")
    .eq("visibility", "public").neq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);

  let wingsPosts: any[] = [];
  if (wingIds.length > 0) {
    const { data } = await supabase.from("posts").select("*")
      .eq("visibility", "wings").in("user_id", wingIds)
      .order("created_at", { ascending: false }).limit(20);
    wingsPosts = data || [];
  }

  // Gather all user IDs for profiles
  const allItems = [...(sessions || []), ...(publicJournal || []), ...wingsJournal, ...(publicPosts || []), ...wingsPosts];
  const allUserIds = [...new Set(allItems.map((i: any) => i.user_id))];
  if (allUserIds.length === 0) return [];

  const { data: profiles } = await supabase.from("public_profiles").select("*").in("user_id", allUserIds);
  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.user_id] = fromRow(p); });

  // Session like/comment counts
  const sessionIds = (sessions || []).map((s: any) => s.id);
  let likeCounts: Record<string, number> = {};
  let commentCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: likes } = await supabase.from("session_likes").select("session_id").in("session_id", sessionIds);
    const { data: comments } = await supabase.from("session_comments").select("session_id").in("session_id", sessionIds);
    (likes || []).forEach((l: any) => { likeCounts[l.session_id] = (likeCounts[l.session_id] || 0) + 1; });
    (comments || []).forEach((c: any) => { commentCounts[c.session_id] = (commentCounts[c.session_id] || 0) + 1; });
  }

  // Build unified feed items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feed: any[] = [];

  (sessions || []).forEach((s: any) => {
    feed.push({ type: "session", data: fromRow(s), profile: profileMap[s.user_id] || null, likeCount: likeCounts[s.id] || 0, commentCount: commentCounts[s.id] || 0, createdAt: s.created_at });
  });

  [...(publicJournal || []), ...wingsJournal].forEach((j: any) => {
    feed.push({ type: "journal", data: fromRow(j), profile: profileMap[j.user_id] || null, createdAt: j.created_at });
  });

  [...(publicPosts || []), ...wingsPosts].forEach((p: any) => {
    feed.push({ type: "post", data: fromRow(p), profile: profileMap[p.user_id] || null, createdAt: p.created_at });
  });

  // Sort by createdAt descending, then filter by location if set
  feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (location) {
    return feed.filter((item) => {
      if (!item.profile) return false;
      return item.profile.location?.toLowerCase().includes(location.toLowerCase());
    });
  }

  return feed;
}

const ALL_TABLES = ["interactions", "contacts", "sessions", "wings", "missions", "journal_entries", "profiles", "gamification"];

export async function clearAllUserData(userId: string) {
  await Promise.all(
    ALL_TABLES.map((table) =>
      supabase.from(table).delete().eq("user_id", userId)
    )
  );
}
