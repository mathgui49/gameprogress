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

export async function joinPublicSession(sessionId: string, userId: string) {
  // Check if already a participant
  const { data: existing } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();
  if (existing) return; // already joined
  await supabase.from("session_participants").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    user_id: userId,
    owner_user_id: userId,
    status: "accepted",
    created_at: new Date().toISOString(),
  });
}

export async function leaveSession(sessionId: string, userId: string) {
  await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
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

// ─── Posts CRUD ─────────────────────────────────────────

export async function createPost(userId: string, post: {
  content: string;
  visibility: "wings" | "public";
  postType: string;
  images: string[];
  hashtags: string[];
  mentions: string[];
  linkedSessionId: string | null;
}) {
  const safeContent = sanitize(post.content, 5000);
  if (!safeContent) return null;
  const id = crypto.randomUUID();
  const { error } = await supabase.from("posts").insert({
    id,
    user_id: userId,
    content: safeContent,
    visibility: post.visibility,
    post_type: post.postType,
    images: post.images,
    hashtags: post.hashtags,
    mentions: post.mentions,
    linked_session_id: post.linkedSessionId,
    is_pinned: false,
    created_at: new Date().toISOString(),
  });
  if (error) { console.error("create post:", error); return null; }
  return id;
}

export async function togglePinPost(postId: string, userId: string) {
  const { data } = await supabase.from("posts").select("is_pinned").eq("id", postId).eq("user_id", userId).single();
  if (!data) return;
  await supabase.from("posts").update({ is_pinned: !data.is_pinned }).eq("id", postId);
}

export async function deletePost(postId: string, userId: string) {
  await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
}

export async function reportPost(postId: string, userId: string, reason: string) {
  await supabase.from("post_reports").insert({
    id: crypto.randomUUID(),
    post_id: postId,
    user_id: userId,
    reason: sanitize(reason, 500),
    created_at: new Date().toISOString(),
  });
}

export async function hidePost(postId: string, userId: string) {
  await supabase.from("post_hides").insert({
    id: crypto.randomUUID(),
    post_id: postId,
    user_id: userId,
    created_at: new Date().toISOString(),
  });
}

// ─── Post Reactions ─────────────────────────────────────

export async function togglePostReaction(postId: string, userId: string, reaction: string) {
  const { data: existing } = await supabase.from("post_reactions")
    .select("id, reaction")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    if (existing.reaction === reaction) {
      // Remove reaction
      await supabase.from("post_reactions").delete().eq("id", existing.id);
      return null;
    }
    // Change reaction
    await supabase.from("post_reactions").update({ reaction }).eq("id", existing.id);
    return reaction;
  }
  // Add reaction
  await supabase.from("post_reactions").insert({
    id: crypto.randomUUID(),
    post_id: postId,
    user_id: userId,
    reaction,
    created_at: new Date().toISOString(),
  });
  return reaction;
}

export async function fetchPostReactions(postId: string) {
  const { data } = await supabase.from("post_reactions")
    .select("*")
    .eq("post_id", postId);
  return (data || []).map((r: any) => fromRow(r));
}

export async function fetchPostReactionCounts(postIds: string[]) {
  if (postIds.length === 0) return {};
  const { data } = await supabase.from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", postIds);
  const counts: Record<string, Record<string, number>> = {};
  (data || []).forEach((r: any) => {
    if (!counts[r.post_id]) counts[r.post_id] = {};
    counts[r.post_id][r.reaction] = (counts[r.post_id][r.reaction] || 0) + 1;
  });
  return counts;
}

export async function fetchUserReactions(postIds: string[], userId: string) {
  if (postIds.length === 0) return {};
  const { data } = await supabase.from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", postIds)
    .eq("user_id", userId);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.post_id] = r.reaction; });
  return map;
}

// ─── Post Comments ──────────────────────────────────────

export async function fetchPostComments(postId: string) {
  const { data } = await supabase.from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (data || []).map((r: any) => fromRow(r));
}

export async function addPostComment(postId: string, userId: string, content: string) {
  const safeContent = sanitize(content, 1000);
  if (!safeContent) return;
  await supabase.from("post_comments").insert({
    id: crypto.randomUUID(),
    post_id: postId,
    user_id: userId,
    content: safeContent,
    created_at: new Date().toISOString(),
  });
}

export async function fetchPostCommentCounts(postIds: string[]) {
  if (postIds.length === 0) return {};
  const { data } = await supabase.from("post_comments")
    .select("post_id")
    .in("post_id", postIds);
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => { counts[r.post_id] = (counts[r.post_id] || 0) + 1; });
  return counts;
}

// ─── Feed ───────────────────────────────────────────────

export async function fetchActivityFeed(
  userId: string,
  wingIds: string[],
  options?: { scope?: "all" | "wings" | "public"; location?: string; limit?: number; offset?: number }
) {
  const scope = options?.scope || "all";
  const limit = options?.limit || 30;
  const fetchLimit = limit + (options?.offset || 0) + 10; // fetch extra for pagination

  // 1. Fetch sessions
  let sessionsData: any[] = [];
  if (scope !== "wings") {
    const { data } = await supabase.from("sessions").select("*").eq("is_public", true)
      .order("created_at", { ascending: false }).limit(fetchLimit);
    sessionsData = data || [];
  }

  // 2. Fetch journal entries
  let journalData: any[] = [];
  if (scope !== "wings") {
    const { data } = await supabase.from("journal_entries").select("*")
      .eq("visibility", "public").neq("user_id", userId)
      .order("created_at", { ascending: false }).limit(fetchLimit);
    journalData = data || [];
  }
  if ((scope === "all" || scope === "wings") && wingIds.length > 0) {
    const { data } = await supabase.from("journal_entries").select("*")
      .eq("visibility", "wings").in("user_id", wingIds)
      .order("created_at", { ascending: false }).limit(fetchLimit);
    journalData = [...journalData, ...(data || [])];
  }

  // 3. Fetch posts
  let postsData: any[] = [];
  if (scope !== "wings") {
    const { data } = await supabase.from("posts").select("*")
      .eq("visibility", "public").neq("user_id", userId)
      .order("created_at", { ascending: false }).limit(fetchLimit);
    postsData = data || [];
  }
  if ((scope === "all" || scope === "wings") && wingIds.length > 0) {
    const { data } = await supabase.from("posts").select("*")
      .eq("visibility", "wings").in("user_id", wingIds)
      .order("created_at", { ascending: false }).limit(fetchLimit);
    postsData = [...postsData, ...(data || [])];
  }
  // Also fetch user's own posts
  const { data: myPosts } = await supabase.from("posts").select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);
  postsData = [...postsData, ...(myPosts || [])];

  // Deduplicate
  const seen = new Set<string>();
  postsData = postsData.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  seen.clear();
  journalData = journalData.filter((j) => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });

  // Gather all user IDs
  const allItems = [...sessionsData, ...journalData, ...postsData];
  const allUserIds = [...new Set(allItems.map((i: any) => i.user_id))];
  if (allUserIds.length === 0) return [];

  const { data: profiles } = await supabase.from("public_profiles").select("*").in("user_id", allUserIds);
  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.user_id] = fromRow(p); });

  // Session like/comment counts
  const sessionIds = sessionsData.map((s: any) => s.id);
  let sesLikeCounts: Record<string, number> = {};
  let sesCommentCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: likes } = await supabase.from("session_likes").select("session_id").in("session_id", sessionIds);
    const { data: comments } = await supabase.from("session_comments").select("session_id").in("session_id", sessionIds);
    (likes || []).forEach((l: any) => { sesLikeCounts[l.session_id] = (sesLikeCounts[l.session_id] || 0) + 1; });
    (comments || []).forEach((c: any) => { sesCommentCounts[c.session_id] = (sesCommentCounts[c.session_id] || 0) + 1; });
  }

  // Post reaction/comment counts
  const postIds = postsData.map((p: any) => p.id);
  const postReactionCounts = await fetchPostReactionCounts(postIds);
  const postCommentCounts = await fetchPostCommentCounts(postIds);
  const userReactions = await fetchUserReactions(postIds, userId);

  // Hidden posts
  const { data: hiddenData } = await supabase.from("post_hides").select("post_id").eq("user_id", userId);
  const hiddenIds = new Set((hiddenData || []).map((h: any) => h.post_id));

  // Build unified feed
  const feed: any[] = [];

  sessionsData.forEach((s: any) => {
    feed.push({
      type: "session", data: fromRow(s), profile: profileMap[s.user_id] || null,
      likeCount: sesLikeCounts[s.id] || 0, commentCount: sesCommentCounts[s.id] || 0,
      createdAt: s.created_at,
    });
  });

  journalData.forEach((j: any) => {
    feed.push({
      type: "journal", data: fromRow(j), profile: profileMap[j.user_id] || null,
      createdAt: j.created_at,
    });
  });

  postsData.forEach((p: any) => {
    if (hiddenIds.has(p.id)) return;
    feed.push({
      type: "post", data: fromRow(p), profile: profileMap[p.user_id] || null,
      reactions: postReactionCounts[p.id] || {},
      commentCount: postCommentCounts[p.id] || 0,
      userReaction: userReactions[p.id] || null,
      createdAt: p.created_at,
    });
  });

  // Sort: pinned first, then by date
  feed.sort((a, b) => {
    const aPinned = a.type === "post" && a.data.isPinned ? 1 : 0;
    const bPinned = b.type === "post" && b.data.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter by location
  let result = feed;
  if (options?.location) {
    result = feed.filter((item) => item.profile?.location?.toLowerCase().includes(options.location!.toLowerCase()));
  }

  // Paginate
  const offset = options?.offset || 0;
  return result.slice(offset, offset + limit);
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

// ─── Community benchmarks (anonymous) ──────────────────

export interface CommunityBenchmarks {
  avgCloseRate: number;
  avgFeelingScore: number;
  avgInteractionsPerWeek: number;
  avgLevel: number;
  totalUsers: number;
}

export async function fetchCommunityBenchmarks(): Promise<CommunityBenchmarks> {
  // Get all interactions (aggregate only, no personal data exposed)
  const { data: allInteractions } = await supabase
    .from("interactions")
    .select("result, feeling_score, user_id, created_at");

  const { data: allGam } = await supabase
    .from("gamification")
    .select("level, user_id");

  const interactions = allInteractions || [];
  const gamData = allGam || [];

  // Unique users
  const userIds = new Set(interactions.map((i: any) => i.user_id));
  const totalUsers = Math.max(userIds.size, 1);

  // Close rate
  const totalCount = interactions.length;
  const closeCount = interactions.filter((i: any) => i.result === "close").length;
  const avgCloseRate = totalCount > 0 ? Math.round((closeCount / totalCount) * 100) : 0;

  // Feeling score
  const avgFeelingScore = totalCount > 0
    ? Math.round((interactions.reduce((s: number, i: any) => s + (i.feeling_score ?? 0), 0) / totalCount) * 10) / 10
    : 0;

  // Interactions per week (last 4 weeks average across all users)
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();
  const recentCount = interactions.filter((i: any) => i.created_at >= fourWeeksAgo).length;
  const avgInteractionsPerWeek = totalUsers > 0 ? Math.round((recentCount / totalUsers / 4) * 10) / 10 : 0;

  // Average level
  const avgLevel = gamData.length > 0
    ? Math.round((gamData.reduce((s: number, g: any) => s + (g.level ?? 1), 0) / gamData.length) * 10) / 10
    : 1;

  return { avgCloseRate, avgFeelingScore, avgInteractionsPerWeek, avgLevel, totalUsers };
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

// ─── Push Subscriptions ──────────────────────────────────

export interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  notifyStreak: boolean;
  notifyMissions: boolean;
  notifyWeekly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotifyPreferences {
  notifyStreak: boolean;
  notifyMissions: boolean;
  notifyWeekly: boolean;
}

export async function upsertPushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  authKey: string,
  prefs: NotifyPreferences,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth_key: authKey,
        notify_streak: prefs.notifyStreak,
        notify_missions: prefs.notifyMissions,
        notify_weekly: prefs.notifyWeekly,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
  if (error) console.error("upsertPushSubscription:", error);
}

export async function updatePushPreferences(userId: string, endpoint: string, prefs: NotifyPreferences) {
  const { error } = await supabase
    .from("push_subscriptions")
    .update({
      notify_streak: prefs.notifyStreak,
      notify_missions: prefs.notifyMissions,
      notify_weekly: prefs.notifyWeekly,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) console.error("updatePushPreferences:", error);
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
}

export async function getPushSubscription(userId: string): Promise<PushSubscriptionRow | null> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data ? fromRow<PushSubscriptionRow>(data) : null;
}

/** Get all push subscriptions that have a specific notification type enabled */
export async function getPushSubscriptionsByType(type: "notify_streak" | "notify_missions" | "notify_weekly"): Promise<PushSubscriptionRow[]> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq(type, true);
  return (data || []).map((r) => fromRow<PushSubscriptionRow>(r));
}

// ─── Messages / Chat ───────────────────────────────────

export async function fetchMessages(userId: string, otherUserId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`)
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("fetch messages:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function fetchGroupMessages(groupId: string, limit = 50) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("fetch group messages:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function sendMessage(fromUserId: string, toUserId: string | null, groupId: string | null, content: string) {
  const safeContent = sanitize(content, 2000);
  if (!safeContent) return null;
  const id = crypto.randomUUID();
  const { error } = await supabase.from("messages").insert({
    id,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    group_id: groupId,
    content: safeContent,
    created_at: new Date().toISOString(),
  });
  if (error) { console.error("send message:", error); return null; }
  return id;
}

export async function markMessagesRead(userId: string, fromUserId: string) {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("to_user_id", userId)
    .eq("from_user_id", fromUserId)
    .is("read_at", null);
}

export async function fetchUnreadCounts(userId: string) {
  const { data } = await supabase
    .from("messages")
    .select("from_user_id")
    .eq("to_user_id", userId)
    .is("read_at", null);
  const counts: Record<string, number> = {};
  (data || []).forEach((r: any) => { counts[r.from_user_id] = (counts[r.from_user_id] || 0) + 1; });
  return counts;
}

export async function fetchConversationList(userId: string) {
  // Get last message per conversation partner
  const { data: sent } = await supabase.from("messages").select("*").eq("from_user_id", userId).is("group_id", null).order("created_at", { ascending: false });
  const { data: received } = await supabase.from("messages").select("*").eq("to_user_id", userId).is("group_id", null).order("created_at", { ascending: false });
  const all = [...(sent || []), ...(received || [])];
  const map: Record<string, any> = {};
  all.forEach((m: any) => {
    const other = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
    if (!map[other] || new Date(m.created_at) > new Date(map[other].created_at)) {
      map[other] = m;
    }
  });
  return Object.entries(map).map(([partnerId, msg]) => ({
    partnerId,
    lastMessage: fromRow<any>(msg),
  })).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
}

// ─── Message Groups ────────────────────────────────────

export async function createMessageGroup(userId: string, name: string, memberIds: string[]) {
  const id = crypto.randomUUID();
  const allMembers = [...new Set([userId, ...memberIds])];
  const { error } = await supabase.from("message_groups").insert({
    id,
    name: sanitize(name, 100),
    created_by: userId,
    member_ids: allMembers,
    created_at: new Date().toISOString(),
  });
  if (error) { console.error("create group:", error); return null; }
  return id;
}

export async function fetchUserGroups(userId: string) {
  const { data } = await supabase.from("message_groups").select("*").contains("member_ids", [userId]);
  return (data || []).map((r) => fromRow<any>(r));
}

export async function renameMessageGroup(userId: string, groupId: string, newName: string) {
  const { data: group } = await supabase.from("message_groups").select("member_ids").eq("id", groupId).single();
  if (!group || !(group.member_ids as string[]).includes(userId)) return false;
  const { error } = await supabase.from("message_groups").update({ name: sanitize(newName, 100) }).eq("id", groupId);
  if (error) { console.error("rename group:", error); return false; }
  return true;
}

// ─── Wing Status ───────────────────────────────────────

export async function upsertWingStatus(userId: string, status: string) {
  await supabase.from("wing_status").upsert({
    user_id: userId,
    status,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchWingStatuses(userIds: string[]) {
  if (userIds.length === 0) return {};
  const { data } = await supabase.from("wing_status").select("*").in("user_id", userIds);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.user_id] = r.status; });
  return map;
}

// ─── Wing Meta (Notes, Categories, Streaks) ────────────

export async function fetchWingMeta(userId: string) {
  const { data } = await supabase.from("wing_meta").select("*").eq("user_id", userId);
  return (data || []).map((r) => fromRow<any>(r));
}

export async function upsertWingMeta(userId: string, wingUserId: string, updates: Record<string, unknown>) {
  const existing = await supabase.from("wing_meta").select("id").eq("user_id", userId).eq("wing_user_id", wingUserId).single();
  if (existing.data) {
    await supabase.from("wing_meta").update(toRow(updates)).eq("id", existing.data.id);
  } else {
    await supabase.from("wing_meta").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      wing_user_id: wingUserId,
      ...toRow(updates),
      created_at: new Date().toISOString(),
    });
  }
}

// ─── Wing Challenges ───────────────────────────────────

export async function fetchWingChallenges(userId: string) {
  const { data, error } = await supabase
    .from("wing_challenges")
    .select("*")
    .or(`created_by.eq.${userId},target_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) { console.error("fetch challenges:", error); return []; }
  return (data || []).map((r) => fromRow<any>(r));
}

export async function createWingChallenge(userId: string, challenge: Record<string, unknown>) {
  const id = crypto.randomUUID();
  const row = toRow(challenge);
  row.id = id;
  row.created_by = userId;
  row.created_at = new Date().toISOString();
  const { error } = await supabase.from("wing_challenges").insert(row);
  if (error) { console.error("create challenge:", error); return null; }
  return id;
}

export async function updateWingChallenge(challengeId: string, userId: string, updates: Record<string, unknown>) {
  const row = toRow(updates);
  delete row.id;
  await supabase.from("wing_challenges").update(row).eq("id", challengeId)
    .or(`created_by.eq.${userId},target_user_id.eq.${userId}`);
}

// ─── Wing Pings ────────────────────────────────────────

export async function createWingPing(userId: string, message: string, location: string, date: string) {
  const id = crypto.randomUUID();
  await supabase.from("wing_pings").insert({
    id,
    from_user_id: userId,
    message: sanitize(message, 200),
    location: sanitize(location, 100),
    date,
    created_at: new Date().toISOString(),
    responded_ids: [],
  });
  return id;
}

export async function fetchRecentPings(wingUserIds: string[]) {
  if (wingUserIds.length === 0) return [];
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { data } = await supabase.from("wing_pings").select("*")
    .in("from_user_id", wingUserIds)
    .gte("date", oneDayAgo)
    .order("created_at", { ascending: false });
  return (data || []).map((r) => fromRow<any>(r));
}

export async function respondToPing(pingId: string, userId: string) {
  const { data } = await supabase.from("wing_pings").select("responded_ids").eq("id", pingId).single();
  if (!data) return;
  const ids = Array.isArray(data.responded_ids) ? data.responded_ids : [];
  if (!ids.includes(userId)) {
    await supabase.from("wing_pings").update({ responded_ids: [...ids, userId] }).eq("id", pingId);
  }
}

// ─── Journal Collections ───────────────────────────────

export async function fetchJournalCollections(userId: string) {
  const { data } = await supabase.from("journal_collections").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data || []).map((r) => fromRow<any>(r));
}

export async function upsertJournalCollection(userId: string, collection: Record<string, unknown>) {
  const row = toRow(collection);
  row.user_id = userId;
  await supabase.from("journal_collections").upsert(row);
}

export async function deleteJournalCollection(id: string, userId: string) {
  await supabase.from("journal_collections").delete().eq("id", id).eq("user_id", userId);
}

// ─── Journal Drafts ────────────────────────────────────

export async function fetchJournalDrafts(userId: string) {
  const { data } = await supabase.from("journal_drafts").select("*").eq("user_id", userId).order("last_saved_at", { ascending: false });
  return (data || []).map((r) => fromRow<any>(r));
}

export async function upsertJournalDraft(userId: string, draft: Record<string, unknown>) {
  const row = toRow(draft);
  row.user_id = userId;
  row.last_saved_at = new Date().toISOString();
  await supabase.from("journal_drafts").upsert(row);
}

export async function deleteJournalDraft(id: string, userId: string) {
  await supabase.from("journal_drafts").delete().eq("id", id).eq("user_id", userId);
}

// ─── Journal Share Links ───────────────────────────────

export async function createJournalShareLink(userId: string, entryId: string, expiresAt: string | null) {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  await supabase.from("journal_share_links").insert({
    id,
    user_id: userId,
    entry_id: entryId,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });
  return { id, token };
}

export async function fetchJournalByShareToken(token: string) {
  const { data: link } = await supabase.from("journal_share_links").select("*").eq("token", token).single();
  if (!link) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
  const { data: entry } = await supabase.from("journal_entries").select("*").eq("id", link.entry_id).single();
  if (!entry) return null;
  return fromRow<any>(entry);
}

export async function deleteJournalShareLink(id: string, userId: string) {
  await supabase.from("journal_share_links").delete().eq("id", id).eq("user_id", userId);
}

// ─── Collaborative Entries ─────────────────────────────

export async function fetchCollaborativeContributions(journalEntryId: string) {
  const { data } = await supabase.from("collaborative_entries").select("*").eq("journal_entry_id", journalEntryId).order("created_at", { ascending: true });
  return (data || []).map((r) => fromRow<any>(r));
}

export async function addCollaborativeContribution(journalEntryId: string, authorId: string, content: string) {
  const safeContent = sanitize(content, 5000);
  if (!safeContent) return null;
  const id = crypto.randomUUID();
  await supabase.from("collaborative_entries").insert({
    id,
    journal_entry_id: journalEntryId,
    author_id: authorId,
    content: safeContent,
    created_at: new Date().toISOString(),
  });
  return id;
}

// ─── Leaderboard Extended ──────────────────────────────

export async function fetchLeaderboardWithXpDetails(location?: string) {
  let query = supabase.from("public_profiles").select("*").eq("is_public", true);
  if (location) query = query.ilike("location", `%${location}%`);
  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return [];

  const userIds = profiles.map((p: any) => p.user_id);
  const { data: gamData } = await supabase.from("gamification").select("*").in("user_id", userIds);

  return profiles.map((p: any) => {
    const gam = (gamData || []).find((g: any) => g.user_id === p.user_id);
    const xpEvents = gam?.xp_events || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekXp = Array.isArray(xpEvents)
      ? xpEvents.filter((e: any) => new Date(e.date) >= weekAgo).reduce((s: number, e: any) => s + (e.amount || 0), 0)
      : 0;

    // XP breakdown by category
    const breakdown: Record<string, number> = {};
    if (Array.isArray(xpEvents)) {
      xpEvents.forEach((e: any) => {
        const cat = e.reason || "other";
        breakdown[cat] = (breakdown[cat] || 0) + (e.amount || 0);
      });
    }

    return {
      ...fromRow<any>(p),
      xp: gam?.xp ?? 0,
      level: gam?.level ?? 1,
      streak: gam?.streak ?? 0,
      lastWeekXp: gam?.xp !== undefined ? (gam.xp - weekXp) : undefined,
      weeklyXp: weekXp,
      xpBreakdown: breakdown,
    };
  }).sort((a: any, b: any) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp));
}

// ─── Shared Sessions Between Wings ─────────────────────

export async function fetchSharedSessions(userId: string, wingUserId: string) {
  // Sessions where both users participated
  const { data: mySessions } = await supabase.from("sessions").select("*").eq("user_id", userId);
  const { data: theirSessions } = await supabase.from("sessions").select("*").eq("user_id", wingUserId);
  const { data: myParticipations } = await supabase.from("session_participants").select("session_id").eq("user_id", userId).eq("status", "accepted");
  const { data: theirParticipations } = await supabase.from("session_participants").select("session_id").eq("user_id", wingUserId).eq("status", "accepted");

  const mySessionIds = new Set([
    ...(mySessions || []).map((s: any) => s.id),
    ...(myParticipations || []).map((p: any) => p.session_id),
  ]);
  const theirSessionIds = new Set([
    ...(theirSessions || []).map((s: any) => s.id),
    ...(theirParticipations || []).map((p: any) => p.session_id),
  ]);

  const sharedIds = [...mySessionIds].filter((id) => theirSessionIds.has(id));
  if (sharedIds.length === 0) return [];

  const { data } = await supabase.from("sessions").select("*").in("id", sharedIds).order("date", { ascending: false });
  return (data || []).map((r) => fromRow<any>(r));
}
