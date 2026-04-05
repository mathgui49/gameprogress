"use server";

import { auth } from "@/lib/auth";
import * as db from "@/lib/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

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
  return db.createMessageGroup(userId, name, memberIds);
}

export async function fetchUserGroupsAction() {
  const userId = await getAuthUserId();
  return db.fetchUserGroups(userId);
}

export async function renameMessageGroupAction(groupId: string, newName: string) {
  const userId = await getAuthUserId();
  return db.renameMessageGroup(userId, groupId, newName);
}

// ─── Wing Status ──────────────────────────────────────

export async function upsertWingStatusAction(status: string) {
  const userId = await getAuthUserId();
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
  return db.createWingChallenge(userId, sanitizeObj(challenge));
}

export async function updateWingChallengeAction(challengeId: string, updates: Record<string, unknown>) {
  const userId = await getAuthUserId();
  await db.updateWingChallenge(challengeId, userId, sanitizeObj(updates));
}

// ─── Wing Pings ───────────────────────────────────────

export async function createWingPingAction(message: string, location: string, date: string) {
  const userId = await getAuthUserId();
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
