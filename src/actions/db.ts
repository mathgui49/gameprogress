"use server";

import { auth } from "@/lib/auth";
import * as db from "@/lib/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

// ─── Rate limiting (server actions) ───────────────────
// WARNING: In-memory rate limiting resets on each serverless cold start.
// For production at scale, migrate to Redis (e.g. Upstash) or Vercel KV.
// This still provides protection within a single instance lifetime.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 min
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateBuckets) {
      if (v.resetAt < now) rateBuckets.delete(k);
    }
  }, 300_000);
}

/** Throws if user exceeds limit. key = "userId:action" */
function checkRate(userId: string, action: string, limit = 30, windowSec = 60) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }
  entry.count++;
  if (entry.count > limit) {
    throw new Error("Rate limit exceeded");
  }
}

// ─── Sanitization ─────────────────────────────────────
import DOMPurify from "isomorphic-dompurify";

/** Strip all HTML from string values in an object (deep). Uses DOMPurify for robust XSS protection. */
function sanitizeObj<T>(obj: T): T {
  if (typeof obj === "string") return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] }).trim() as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObj) as unknown as T;
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeObj(v);
    return out as T;
  }
  return obj;
}

// ─── Input validation ─────────────────────────────────
function assertString(val: unknown, name: string, maxLen = 5000): string {
  if (typeof val !== "string") throw new Error(`${name} must be a string`);
  if (val.length > maxLen) throw new Error(`${name} exceeds max length (${maxLen})`);
  return val;
}

function assertEnum<T extends string>(val: unknown, name: string, allowed: readonly T[]): T {
  if (!allowed.includes(val as T)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return val as T;
}

function assertInt(val: unknown, name: string, min = 0, max = 10000): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be integer ${min}-${max}`);
  return n;
}

function assertArray(val: unknown, name: string, maxLen = 100): unknown[] {
  if (!Array.isArray(val)) throw new Error(`${name} must be an array`);
  if (val.length > maxLen) throw new Error(`${name} exceeds max items (${maxLen})`);
  return val;
}

function assertStringArray(val: unknown, name: string, maxLen = 100, maxItemLen = 500): string[] {
  const arr = assertArray(val, name, maxLen);
  return arr.map((item, i) => assertString(item, `${name}[${i}]`, maxItemLen));
}

// Allowed tables for generic CRUD (prevent accessing arbitrary tables)
const ALLOWED_TABLES = new Set([
  "interactions", "contacts", "sessions", "wings", "missions",
  "journal_entries", "profiles", "gamification", "public_profiles",
  "subscriptions", "push_subscriptions",
]);

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
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  const userId = await getAuthUserId();
  return db.fetchAll<T>(table, userId);
}

export async function fetchPaginatedAction<T>(table: string, page = 0, pageSize = 50): Promise<{ items: T[]; total: number; hasMore: boolean }> {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  assertInt(page, "page", 0, 10000);
  assertInt(pageSize, "pageSize", 1, 200);
  const userId = await getAuthUserId();
  return db.fetchPaginated<T>(table, userId, page, pageSize);
}

export async function fetchOneAction<T>(table: string): Promise<T | null> {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  const userId = await getAuthUserId();
  return db.fetchOne<T>(table, userId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertRowAction(table: string, obj: any) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  const userId = await getAuthUserId();
  checkRate(userId, `insert:${table}`, 30, 60);
  await db.insertRow(table, userId, sanitizeObj(obj));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRowAction(table: string, id: string, obj: any) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  assertString(id, "id", 200);
  const userId = await getAuthUserId();
  checkRate(userId, `update:${table}`, 30, 60);
  await db.updateRow(table, id, sanitizeObj(obj), userId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertRowAction(table: string, obj: any) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  const userId = await getAuthUserId();
  checkRate(userId, `upsert:${table}`, 30, 60);
  await db.upsertRow(table, userId, sanitizeObj(obj));
}

export async function deleteRowAction(table: string, id: string) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Invalid table");
  assertString(id, "id", 200);
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
  checkRate(userId, "wingRequest", 10, 60);
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
  const userId = await getAuthUserId();
  // Own data: return all sessions. Other users: only public sessions.
  if (targetUserId === userId) {
    return db.fetchSessionsByUserId(targetUserId);
  }
  return db.fetchPublicSessionsByUserId(targetUserId);
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
  options?: { scope?: "all" | "wings" | "public"; userLat?: number; userLng?: number; limit?: number; offset?: number },
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
  checkRate(userId, "sessionComment", 20, 60);
  assertString(sessionId, "sessionId", 200);
  assertString(content, "content", 3000);
  await db.addSessionComment(sessionId, userId, sanitizeObj(content));
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
  checkRate(userId, "createPost", 10, 60);
  assertString(post.content, "content", 10000);
  assertEnum(post.visibility, "visibility", ["wings", "public"] as const);
  assertEnum(post.postType, "postType", ["field_report", "tip", "question", "story", "other"] as const);
  assertArray(post.images, "images", 10);
  assertStringArray(post.hashtags, "hashtags", 20, 100);
  assertStringArray(post.mentions, "mentions", 20, 200);
  return db.createPost(userId, sanitizeObj(post));
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
  checkRate(userId, "report", 5, 60);
  assertString(postId, "postId", 200);
  assertString(reason, "reason", 500);
  await db.reportPost(postId, userId, sanitizeObj(reason));
}

export async function hidePostAction(postId: string) {
  const userId = await getAuthUserId();
  await db.hidePost(postId, userId);
}

export async function togglePostReactionAction(postId: string, reaction: string) {
  const userId = await getAuthUserId();
  checkRate(userId, "reaction", 30, 60);
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
  checkRate(userId, "postComment", 20, 60);
  assertString(postId, "postId", 200);
  assertString(content, "content", 3000);
  await db.addPostComment(postId, userId, sanitizeObj(content));
}

// ─── User public data ──────────────────────────────────

export async function fetchUserPublicPostsAction(targetUserId: string, viewerIsWing: boolean) {
  const userId = await getAuthUserId();
  // Verify wing relationship server-side instead of trusting client
  const isActuallyWing = viewerIsWing ? await db.checkIsWing(userId, targetUserId) : false;
  return db.fetchUserPublicPosts(targetUserId, isActuallyWing);
}

export async function fetchUserPublicJournalAction(targetUserId: string, viewerIsWing: boolean) {
  const userId = await getAuthUserId();
  const isActuallyWing = viewerIsWing ? await db.checkIsWing(userId, targetUserId) : false;
  return db.fetchUserPublicJournal(targetUserId, isActuallyWing);
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

export async function exportAllUserDataAction() {
  const userId = await getAuthUserId();
  checkRate(userId, "export", 3, 300);
  return db.exportAllUserData(userId);
}

export async function deleteAccountAction() {
  const userId = await getAuthUserId();
  await db.clearAllUserData(userId);
  // Storage cleanup is best-effort
  try {
    const { supabaseServer } = await import("@/lib/supabase-server");
    for (const folder of ["profiles", "photos", "posts"]) {
      const { data: files } = await supabaseServer.storage
        .from("uploads").list(`${folder}/${userId}`);
      if (files?.length) {
        await supabaseServer.storage.from("uploads")
          .remove(files.map((f) => `${folder}/${userId}/${f.name}`));
      }
    }
  } catch {
    // Non-critical
  }
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

export async function adminGetReportsAction() {
  await requireAdmin();
  return db.adminGetReports();
}

export async function adminResolveReportAction(reportId: string) {
  await requireAdmin();
  assertString(reportId, "reportId", 200);
  await db.adminResolveReport(reportId);
}

export async function adminDeletePostAction(postId: string) {
  await requireAdmin();
  assertString(postId, "postId", 200);
  await db.adminDeletePost(postId);
}

export async function adminSendPushAction(title: string, body: string, url?: string) {
  await requireAdmin();
  assertString(title, "title", 200);
  assertString(body, "body", 500);
  if (url) assertString(url, "url", 500);

  const subs = await db.adminGetAllPushSubscriptions();
  if (subs.length === 0) return { sent: 0, failed: 0, total: 0 };

  const webPush = (await import("web-push")).default;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@gameprogress.app";
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webPush.setVapidDetails(email, pub, priv);

  const payload = JSON.stringify({
    title,
    body,
    tag: "admin-custom",
    url: url || "/",
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await db.deletePushSubscription(sub.userId, sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed, total: subs.length };
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

// ─── Messages / Chat ──────────────────────────────────

export async function fetchMessagesAction(otherUserId: string) {
  const userId = await getAuthUserId();
  return db.fetchMessages(userId, otherUserId);
}

export async function fetchGroupMessagesAction(groupId: string) {
  await getAuthUserId();
  return db.fetchGroupMessages(groupId);
}

export async function sendMessageAction(toUserId: string | null, groupId: string | null, content: string) {
  const userId = await getAuthUserId();
  checkRate(userId, "sendMessage", 30, 60);
  assertString(content, "content", 5000);
  if (toUserId) assertString(toUserId, "toUserId", 200);
  if (groupId) assertString(groupId, "groupId", 200);
  return db.sendMessage(userId, toUserId, groupId, content);
}

export async function markMessagesReadAction(fromUserId: string) {
  const userId = await getAuthUserId();
  await db.markMessagesRead(userId, fromUserId);
}

export async function fetchUnreadCountsAction() {
  const userId = await getAuthUserId();
  return db.fetchUnreadCounts(userId);
}

export async function fetchConversationListAction() {
  const userId = await getAuthUserId();
  return db.fetchConversationList(userId);
}

// ─── Message Groups ───────────────────────────────────

export async function createMessageGroupAction(name: string, memberIds: string[]) {
  const userId = await getAuthUserId();
  checkRate(userId, "createGroup", 5, 60);
  assertString(name, "name", 100);
  assertStringArray(memberIds, "memberIds", 50, 200);
  return db.createMessageGroup(userId, name, memberIds);
}

export async function fetchUserGroupsAction() {
  const userId = await getAuthUserId();
  return db.fetchUserGroups(userId);
}

export async function renameMessageGroupAction(groupId: string, newName: string) {
  const userId = await getAuthUserId();
  assertString(groupId, "groupId", 200);
  assertString(newName, "newName", 100);
  return db.renameMessageGroup(userId, groupId, newName);
}

// ─── Wing Status ──────────────────────────────────────

export async function upsertWingStatusAction(status: string) {
  const userId = await getAuthUserId();
  assertEnum(status, "status", ["available", "in_session", "busy", "offline"] as const);
  await db.upsertWingStatus(userId, status);
}

export async function fetchWingStatusesAction(userIds: string[]) {
  await getAuthUserId();
  return db.fetchWingStatuses(userIds);
}

// ─── Wing Meta ────────────────────────────────────────

export async function fetchWingMetaAction() {
  const userId = await getAuthUserId();
  return db.fetchWingMeta(userId);
}

export async function upsertWingMetaAction(wingUserId: string, updates: Record<string, unknown>) {
  const userId = await getAuthUserId();
  await db.upsertWingMeta(userId, wingUserId, sanitizeObj(updates));
}

// ─── Wing Challenges ──────────────────────────────────

export async function fetchWingChallengesAction() {
  const userId = await getAuthUserId();
  return db.fetchWingChallenges(userId);
}

export async function createWingChallengeAction(challenge: Record<string, unknown>) {
  const userId = await getAuthUserId();
  checkRate(userId, "createChallenge", 5, 60);
  return db.createWingChallenge(userId, sanitizeObj(challenge));
}

export async function updateWingChallengeAction(challengeId: string, updates: Record<string, unknown>) {
  const userId = await getAuthUserId();
  await db.updateWingChallenge(challengeId, userId, sanitizeObj(updates));
}

// ─── Wing Pings ───────────────────────────────────────

export async function createWingPingAction(message: string, location: string, date: string) {
  const userId = await getAuthUserId();
  checkRate(userId, "ping", 5, 300); // 5 pings per 5 min
  assertString(message, "message", 500);
  assertString(location, "location", 200);
  assertString(date, "date", 30);
  return db.createWingPing(userId, message, location, date);
}

export async function fetchRecentPingsAction(wingUserIds: string[]) {
  await getAuthUserId();
  return db.fetchRecentPings(wingUserIds);
}

export async function respondToPingAction(pingId: string) {
  const userId = await getAuthUserId();
  await db.respondToPing(pingId, userId);
}

// ─── Journal Collections ──────────────────────────────

export async function fetchJournalCollectionsAction() {
  const userId = await getAuthUserId();
  return db.fetchJournalCollections(userId);
}

export async function upsertJournalCollectionAction(collection: Record<string, unknown>) {
  const userId = await getAuthUserId();
  await db.upsertJournalCollection(userId, sanitizeObj(collection));
}

export async function deleteJournalCollectionAction(id: string) {
  const userId = await getAuthUserId();
  await db.deleteJournalCollection(id, userId);
}

// ─── Journal Drafts ───────────────────────────────────

export async function fetchJournalDraftsAction() {
  const userId = await getAuthUserId();
  return db.fetchJournalDrafts(userId);
}

export async function upsertJournalDraftAction(draft: Record<string, unknown>) {
  const userId = await getAuthUserId();
  await db.upsertJournalDraft(userId, sanitizeObj(draft));
}

export async function deleteJournalDraftAction(id: string) {
  const userId = await getAuthUserId();
  await db.deleteJournalDraft(id, userId);
}

// ─── Journal Share Links ──────────────────────────────

export async function createJournalShareLinkAction(entryId: string, expiresAt: string | null) {
  const userId = await getAuthUserId();
  return db.createJournalShareLink(userId, entryId, expiresAt);
}

export async function fetchJournalByShareTokenAction(token: string) {
  // No auth required — public access via token
  return db.fetchJournalByShareToken(token);
}

export async function deleteJournalShareLinkAction(id: string) {
  const userId = await getAuthUserId();
  await db.deleteJournalShareLink(id, userId);
}

// ─── Collaborative Entries ────────────────────────────

export async function fetchCollaborativeContributionsAction(journalEntryId: string) {
  await getAuthUserId();
  return db.fetchCollaborativeContributions(journalEntryId);
}

export async function addCollaborativeContributionAction(journalEntryId: string, content: string) {
  const userId = await getAuthUserId();
  return db.addCollaborativeContribution(journalEntryId, userId, content);
}

// ─── Leaderboard Extended ─────────────────────────────

export async function fetchLeaderboardWithXpDetailsAction(location?: string) {
  await getAuthUserId();
  return db.fetchLeaderboardWithXpDetails(location);
}

// ─── Shared Sessions ──────────────────────────────────

export async function fetchSharedSessionsAction(wingUserId: string) {
  const userId = await getAuthUserId();
  return db.fetchSharedSessions(userId, wingUserId);
}

// ─── Image Upload ───────��────────────────────────────

export async function uploadImageAction(base64Data: string, folder: "photos" | "profiles" | "posts"): Promise<string | null> {
  const userId = await getAuthUserId();
  checkRate(userId, "upload", 10, 60);
  assertString(base64Data, "base64Data", 7_000_000); // ~5MB base64
  assertEnum(folder, "folder", ["photos", "profiles", "posts"] as const);
  const { uploadImage } = await import("@/lib/upload");
  return uploadImage(userId, base64Data, folder);
}

// ─── Referral System ──────────────────────────────────

export async function fetchReferralCodeAction(): Promise<string> {
  const userId = await getAuthUserId();
  // Generate a deterministic code from user ID
  const code = btoa(userId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return code;
}

export async function fetchReferralStatsAction() {
  await getAuthUserId();
  // STUB: Returns placeholder data until referrals table is created.
  // Do not expose real user data or logic here until properly implemented.
  return { referralCount: 0, convertedCount: 0, earnedDays: 0 };
}

// ─── Ambassador System ────────────────────────────────

export async function fetchAmbassadorCodeAction(): Promise<string | null> {
  const userId = await getAuthUserId();
  // STUB: Deterministic code from user ID. Replace with DB lookup when ambassadors table is ready.
  const code = "AMB-" + btoa(userId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return code;
}

export async function fetchAmbassadorStatsAction() {
  await getAuthUserId();
  // STUB: Returns placeholder data until ambassadors table is created.
  return { totalReferrals: 0, activeSubscribers: 0, totalEarnings: 0, monthlyEarnings: 0, isApproved: false };
}
