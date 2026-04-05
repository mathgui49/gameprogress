import { supabaseServer as supabase } from "./supabase-server";

// ─── Input sanitization ────────────────────────────────
const MAX_TEXT_LENGTH = 5000;
const MAX_SHORT_TEXT = 200;

/** Strip HTML tags and trim to max length */
export function sanitize(input: string, maxLen = MAX_TEXT_LENGTH): string {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

export function sanitizeShort(input: string): string {
  return sanitize(input, MAX_SHORT_TEXT);
}

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
export async function updateRow(table: string, id: string, obj: any, userId?: string) {
  const row = toRow(obj);
  delete row.id;
  delete row.user_id;
  let query = supabase.from(table).update(row).eq("id", id);
  // Scope update to the owner — prevents cross-user modification
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) console.error(`update ${table}:`, error);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertRow(table: string, userId: string, obj: any) {
  const row = toRow(obj);
  row.user_id = userId;
  const { error } = await supabase.from(table).upsert(row);
  if (error) console.error(`upsert ${table}:`, error);
}

export async function deleteRow(table: string, id: string, userId?: string) {
  let query = supabase.from(table).delete().eq("id", id);
  // Scope delete to the owner — prevents cross-user deletion
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
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

export async function updateWingRequestStatus(requestId: string, status: string, userId: string) {
  // Only the recipient (to_user_id) can accept/decline a request
  const { error } = await supabase
    .from("wing_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("to_user_id", userId);
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
  const safeContent = sanitize(content, 1000);
  if (!safeContent) return;
  await supabase.from("session_comments").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    user_id: userId,
    content: safeContent,
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

// ─── User public data (for profile pages) ──────────────

export async function fetchUserPublicPosts(userId: string, viewerIsWing: boolean) {
  let query = supabase.from("posts").select("*").eq("user_id", userId);
  if (viewerIsWing) {
    query = query.in("visibility", ["public", "wings"]);
  } else {
    query = query.eq("visibility", "public");
  }
  const { data } = await query.order("created_at", { ascending: false }).limit(20);
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchUserPublicJournal(userId: string, viewerIsWing: boolean) {
  let query = supabase.from("journal_entries").select("*").eq("user_id", userId);
  if (viewerIsWing) {
    query = query.in("visibility", ["public", "wings"]);
  } else {
    query = query.eq("visibility", "public");
  }
  const { data } = await query.order("created_at", { ascending: false }).limit(20);
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchUserGamification(userId: string) {
  const { data } = await supabase.from("gamification").select("*").eq("user_id", userId).single();
  if (!data) return { xp: 0, level: 1, streak: 0 };
  return { xp: data.xp ?? 0, level: data.level ?? 1, streak: data.streak ?? 0 };
}

export async function fetchUserBadges(userId: string) {
  const { data } = await supabase.from("gamification").select("badges").eq("user_id", userId).single();
  if (!data?.badges) return [];
  const badges = typeof data.badges === "string" ? JSON.parse(data.badges) : data.badges;
  return (badges || []).filter((b: any) => b.unlockedAt);
}

export async function fetchUserLeaderboardRank(userId: string) {
  const { data: profiles } = await supabase.from("public_profiles").select("user_id").eq("is_public", true);
  if (!profiles || profiles.length === 0) return null;
  const userIds = profiles.map((p: any) => p.user_id);
  const { data: gamData } = await supabase.from("gamification").select("*").in("user_id", userIds);
  if (!gamData) return null;
  const sorted = gamData.sort((a: any, b: any) => ((b.level ?? 1) * 10000 + (b.xp ?? 0)) - ((a.level ?? 1) * 10000 + (a.xp ?? 0)));
  const idx = sorted.findIndex((g: any) => g.user_id === userId);
  return idx >= 0 ? idx + 1 : null;
}

// ─── Session Invites ────────────────────────────────────

export async function inviteWingsToSession(sessionId: string, ownerUserId: string, wingUserIds: string[]) {
  if (wingUserIds.length === 0) return;
  const rows = wingUserIds.map((uid) => ({
    id: crypto.randomUUID(),
    session_id: sessionId,
    user_id: uid,
    owner_user_id: ownerUserId,
    status: "pending",
    created_at: new Date().toISOString(),
  }));
  await supabase.from("session_participants").insert(rows);
}

export async function fetchSessionInvitesForUser(userId: string) {
  const { data, error } = await supabase
    .from("session_participants")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetch session invites:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function updateSessionInviteStatus(participantId: string, status: "accepted" | "declined", userId: string) {
  // Only the invited user can accept/decline their own invite
  const { error } = await supabase
    .from("session_participants")
    .update({ status })
    .eq("id", participantId)
    .eq("user_id", userId);
  if (error) console.error("update session invite:", error);
}

export async function fetchAcceptedSessionsForUser(userId: string) {
  // Get session IDs where user is accepted participant
  const { data: participations, error } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("user_id", userId)
    .eq("status", "accepted");
  if (error || !participations || participations.length === 0) return [];

  const sessionIds = participations.map((p: any) => p.session_id);
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .in("id", sessionIds)
    .order("date", { ascending: false });
  return (sessions || []).map((r) => fromRow<any>(r));
}

export async function fetchSessionParticipantsWithProfiles(sessionId: string) {
  const { data: participants } = await supabase
    .from("session_participants")
    .select("*")
    .eq("session_id", sessionId);
  if (!participants || participants.length === 0) return [];

  const userIds = participants.map((p: any) => p.user_id);
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("*")
    .in("user_id", userIds);

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.user_id] = fromRow(p); });

  return participants.map((p: any) => ({
    ...fromRow<any>(p),
    profile: profileMap[p.user_id] || null,
  }));
}

// ─── Subscriptions (Stripe) ────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: "active" | "canceled" | "past_due" | "inactive";
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return fromRow<Subscription>(data);
}

export async function upsertSubscription(userId: string, fields: Partial<Record<string, unknown>>) {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) row[toSnake(k)] = v;
  row.user_id = userId;
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) console.error("upsert subscription:", error);
}

const ALL_TABLES = ["interactions", "contacts", "sessions", "wings", "missions", "journal_entries", "profiles", "gamification", "public_profiles", "wing_requests", "posts", "session_likes", "session_comments", "session_participants"];

export async function clearAllUserData(userId: string) {
  await Promise.all(
    ALL_TABLES.map((table) =>
      supabase.from(table).delete().eq("user_id", userId)
    )
  );
}

// ─── Admin ──────────────────────────────────────────────

export async function adminGetStats() {
  const tables = ["interactions", "contacts", "sessions", "journal_entries", "posts", "missions"];
  const counts: Record<string, number> = {};
  await Promise.all(tables.map(async (t) => {
    const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
    counts[t] = count ?? 0;
  }));

  // User count from public_profiles
  const { count: userCount } = await supabase.from("public_profiles").select("*", { count: "exact", head: true });
  counts.users = userCount ?? 0;

  return counts;
}

export async function adminGetAllProfiles() {
  const { data } = await supabase.from("public_profiles").select("*").order("created_at", { ascending: false });
  return (data || []).map((r: any) => fromRow(r));
}

export async function adminGetAllSessions() {
  const { data } = await supabase.from("sessions").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50);
  return (data || []).map((r: any) => fromRow(r));
}

export async function adminDeleteUser(userId: string) {
  await clearAllUserData(userId);
}

export async function adminDeleteSession(sessionId: string) {
  await supabase.from("sessions").delete().eq("id", sessionId);
  await supabase.from("session_likes").delete().eq("session_id", sessionId);
  await supabase.from("session_comments").delete().eq("session_id", sessionId);
  await supabase.from("session_participants").delete().eq("session_id", sessionId);
}

export async function adminGetAnnouncement() {
  const { data } = await supabase.from("admin_settings").select("*").eq("key", "announcement").single();
  return data?.value ?? null;
}

export async function adminSetAnnouncement(message: string | null) {
  if (!message) {
    await supabase.from("admin_settings").delete().eq("key", "announcement");
  } else {
    const safe = sanitize(message, 500);
    await supabase.from("admin_settings").upsert({ key: "announcement", value: safe });
  }
}
