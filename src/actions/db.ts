"use server";

import { auth } from "@/lib/auth";
import * as db from "@/lib/db";

const ADMIN_EMAIL = "mathieu.guicheteau7@gmail.com";

// ─── Sanitization ─────────────────────────────────────
/** Strip HTML/script tags from all string values in an object (deep) */
function sanitizeObj<T>(obj: T): T {
  if (typeof obj === "string") return obj.replace(/<[^>]*>/g, "").trim() as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObj) as unknown as T;
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeObj(v);
    return out as T;
  }
  return obj;
}

// ─── Auth helper ───────────────────────────────────────
async function getAuthUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  return session.user.email;
}

async function requireAdmin(): Promise<string> {
  const userId = await getAuthUserId();
  if (userId !== ADMIN_EMAIL) throw new Error("Forbidden");
  return userId;
}

// ─── Generic CRUD (auth-scoped) ────────────────────────

export async function fetchAllAction<T>(table: string): Promise<T[]> {
  const userId = await getAuthUserId();
  return db.fetchAll<T>(table, userId);
}

export async function fetchOneAction<T>(table: string): Promise<T | null> {
  const userId = await getAuthUserId();
  return db.fetchOne<T>(table, userId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertRowAction(table: string, obj: any) {
  const userId = await getAuthUserId();
  await db.insertRow(table, userId, sanitizeObj(obj));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRowAction(table: string, id: string, obj: any) {
  const userId = await getAuthUserId();
  await db.updateRow(table, id, sanitizeObj(obj), userId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertRowAction(table: string, obj: any) {
  const userId = await getAuthUserId();
  await db.upsertRow(table, userId, sanitizeObj(obj));
}

export async function deleteRowAction(table: string, id: string) {
  const userId = await getAuthUserId();
  await db.deleteRow(table, id, userId);
}

// ─── Wing requests ─────────────────────────────────────

export async function fetchWingRequestsAction() {
  const userId = await getAuthUserId();
  return db.fetchWingRequests(userId);
}

export async function sendWingRequestAction(toUserId: string) {
  const userId = await getAuthUserId();
  if (toUserId === userId) return;
  const row = db.toRow({
    id: crypto.randomUUID(),
    fromUserId: userId,
    toUserId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  const { supabaseServer } = await import("@/lib/supabase-server");
  await supabaseServer.from("wing_requests").insert(row);
}

export async function acceptWingRequestAction(requestId: string) {
  const userId = await getAuthUserId();
  await db.updateWingRequestStatus(requestId, "accepted", userId);
}

export async function declineWingRequestAction(requestId: string) {
  const userId = await getAuthUserId();
  await db.updateWingRequestStatus(requestId, "declined", userId);
}

// ─── Profiles ──────────────────────────────────────────

export async function fetchProfilesByIdsAction(userIds: string[]) {
  await getAuthUserId();
  return db.fetchProfilesByIds(userIds);
}

export async function searchPublicProfilesAction(location?: string) {
  await getAuthUserId();
  return db.searchPublicProfiles(location);
}

export async function findProfileByUsernameAction(username: string) {
  await getAuthUserId();
  return db.findProfileByUsername(username);
}

// ─── Sessions ──────────────────────────────────────────

export async function fetchSessionsByUserIdAction(targetUserId: string) {
  await getAuthUserId();
  return db.fetchSessionsByUserId(targetUserId);
}

export async function fetchAcceptedSessionsForUserAction() {
  const userId = await getAuthUserId();
  return db.fetchAcceptedSessionsForUser(userId);
}

export async function inviteWingsToSessionAction(sessionId: string, wingUserIds: string[]) {
  const userId = await getAuthUserId();
  await db.inviteWingsToSession(sessionId, userId, wingUserIds);
}

export async function fetchSessionInvitesForUserAction() {
  const userId = await getAuthUserId();
  return db.fetchSessionInvitesForUser(userId);
}

export async function updateSessionInviteStatusAction(participantId: string, status: "accepted" | "declined") {
  const userId = await getAuthUserId();
  await db.updateSessionInviteStatus(participantId, status, userId);
}

export async function fetchSessionParticipantsWithProfilesAction(sessionId: string) {
  await getAuthUserId();
  return db.fetchSessionParticipantsWithProfiles(sessionId);
}

export async function fetchSessionsByIdsAction(sessionIds: string[]) {
  await getAuthUserId();
  if (sessionIds.length === 0) return [];
  const { supabaseServer } = await import("@/lib/supabase-server");
  const { data } = await supabaseServer.from("sessions").select("*").in("id", sessionIds);
  return (data || []).map((r: Record<string, unknown>) => db.fromRow(r));
}

// ─── Feed & Social ─────────────────────────────────────

export async function fetchActivityFeedAction(
  wingIds: string[],
  options?: { scope?: "all" | "wings" | "public"; location?: string; limit?: number; offset?: number },
) {
  const userId = await getAuthUserId();
  return db.fetchActivityFeed(userId, wingIds, options);
}

export async function toggleSessionLikeAction(sessionId: string) {
  const userId = await getAuthUserId();
  return db.toggleSessionLike(sessionId, userId);
}

export async function fetchSessionCommentsAction(sessionId: string) {
  await getAuthUserId();
  return db.fetchSessionComments(sessionId);
}

export async function addSessionCommentAction(sessionId: string, content: string) {
  const userId = await getAuthUserId();
  await db.addSessionComment(sessionId, userId, content);
}

export async function fetchPublicSessionsAction() {
  await getAuthUserId();
  return db.fetchPublicSessions();
}

export async function joinPublicSessionAction(sessionId: string) {
  const userId = await getAuthUserId();
  await db.joinPublicSession(sessionId, userId);
}

export async function leaveSessionAction(sessionId: string) {
  const userId = await getAuthUserId();
  await db.leaveSession(sessionId, userId);
}

// ─── Leaderboard ───────────────────────────────────────

export async function fetchLeaderboardAction(location?: string) {
  await getAuthUserId();
  return db.fetchLeaderboard(location);
}

// ─── Posts ────────────────────────────────────────────

export async function createPostAction(post: {
  content: string;
  visibility: "wings" | "public";
  postType: string;
  images: string[];
  hashtags: string[];
  mentions: string[];
  linkedSessionId: string | null;
}) {
  const userId = await getAuthUserId();
  return db.createPost(userId, post);
}

export async function deletePostAction(postId: string) {
  const userId = await getAuthUserId();
  await db.deletePost(postId, userId);
}

export async function togglePinPostAction(postId: string) {
  const userId = await getAuthUserId();
  await db.togglePinPost(postId, userId);
}

export async function reportPostAction(postId: string, reason: string) {
  const userId = await getAuthUserId();
  await db.reportPost(postId, userId, reason);
}

export async function hidePostAction(postId: string) {
  const userId = await getAuthUserId();
  await db.hidePost(postId, userId);
}

export async function togglePostReactionAction(postId: string, reaction: string) {
  const userId = await getAuthUserId();
  return db.togglePostReaction(postId, userId, reaction);
}

export async function fetchPostReactionsAction(postId: string) {
  await getAuthUserId();
  return db.fetchPostReactions(postId);
}

export async function fetchPostCommentsAction(postId: string) {
  await getAuthUserId();
  return db.fetchPostComments(postId);
}

export async function addPostCommentAction(postId: string, content: string) {
  const userId = await getAuthUserId();
  await db.addPostComment(postId, userId, content);
}

// ─── User public data ──────────────────────────────────

export async function fetchUserPublicPostsAction(targetUserId: string, viewerIsWing: boolean) {
  await getAuthUserId();
  return db.fetchUserPublicPosts(targetUserId, viewerIsWing);
}

export async function fetchUserPublicJournalAction(targetUserId: string, viewerIsWing: boolean) {
  await getAuthUserId();
  return db.fetchUserPublicJournal(targetUserId, viewerIsWing);
}

export async function fetchUserGamificationAction(targetUserId: string) {
  await getAuthUserId();
  return db.fetchUserGamification(targetUserId);
}

export async function fetchUserBadgesAction(targetUserId: string) {
  await getAuthUserId();
  return db.fetchUserBadges(targetUserId);
}

export async function fetchUserLeaderboardRankAction(targetUserId: string) {
  await getAuthUserId();
  return db.fetchUserLeaderboardRank(targetUserId);
}

// ─── Settings ──────────────────────────────────────────

export async function clearAllUserDataAction() {
  const userId = await getAuthUserId();
  await db.clearAllUserData(userId);
}

// ─── Announcement (public read) ────────────────────────

export async function fetchAnnouncementAction() {
  // No auth required — displayed to all logged-in users
  return db.adminGetAnnouncement();
}

// ─── Admin (admin-only) ────────────────────────────────

export async function adminGetStatsAction() {
  await requireAdmin();
  return db.adminGetStats();
}

export async function adminGetAllProfilesAction() {
  await requireAdmin();
  return db.adminGetAllProfiles();
}

export async function adminGetAllSessionsAction() {
  await requireAdmin();
  return db.adminGetAllSessions();
}

export async function adminDeleteUserAction(targetUserId: string) {
  await requireAdmin();
  await db.adminDeleteUser(targetUserId);
}

export async function adminDeleteSessionAction(sessionId: string) {
  await requireAdmin();
  await db.adminDeleteSession(sessionId);
}

export async function adminSetAnnouncementAction(message: string | null) {
  await requireAdmin();
  await db.adminSetAnnouncement(message);
}

export async function adminGetAnnouncementAction() {
  await requireAdmin();
  return db.adminGetAnnouncement();
}

// ─── Community Benchmarks (anonymous) ─────────────────

export async function fetchCommunityBenchmarksAction() {
  await getAuthUserId(); // Must be authenticated
  return db.fetchCommunityBenchmarks();
}

// ─── Push Subscriptions ───────────────────────────────

export async function upsertPushSubscriptionAction(
  endpoint: string,
  p256dh: string,
  authKey: string,
  prefs: db.NotifyPreferences,
) {
  const userId = await getAuthUserId();
  await db.upsertPushSubscription(userId, endpoint, p256dh, authKey, prefs);
}

export async function updatePushPreferencesAction(endpoint: string, prefs: db.NotifyPreferences) {
  const userId = await getAuthUserId();
  await db.updatePushPreferences(userId, endpoint, prefs);
}

export async function deletePushSubscriptionAction(endpoint: string) {
  const userId = await getAuthUserId();
  await db.deletePushSubscription(userId, endpoint);
}

export async function getPushSubscriptionAction() {
  const userId = await getAuthUserId();
  return db.getPushSubscription(userId);
}
