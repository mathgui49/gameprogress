import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { fromRow } from "@/lib/db";
import type { PushSubscriptionRow } from "@/lib/db";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@gameprogress.app";
  if (pub && priv) {
    webPush.setVapidDetails(email, pub, priv);
    vapidConfigured = true;
  }
}

// ─── Smart streak check: only notify users who haven't logged today ───
async function getUsersWithNoInteractionToday(): Promise<Set<string>> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("interactions")
    .select("user_id")
    .gte("created_at", todayStart.toISOString());

  const activeToday = new Set((data || []).map((r: { user_id: string }) => r.user_id));
  return activeToday;
}

// ─── Check if today is Sunday (weekly recap) ──────────────────────────
function isSunday(): boolean {
  return new Date().getDay() === 0;
}

// ─── Send to a list of subscriptions ──────────────────────────────────
async function sendToSubs(
  subs: PushSubscriptionRow[],
  payload: string,
): Promise<{ sent: number; failed: number }> {
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
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
}

/**
 * Daily cron endpoint — called once per day by Vercel Cron.
 * Sends streak reminders (to users who haven't logged today),
 * mission reminders (to all opted-in), and weekly recaps (Sundays only).
 */
export async function GET(req: NextRequest) {
  const PUSH_SECRET = process.env.PUSH_CRON_SECRET ?? "";
  const authHeader = req.headers.get("authorization");
  if (!PUSH_SECRET || authHeader !== `Bearer ${PUSH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureVapid();
  if (!vapidConfigured) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const results: Record<string, { sent: number; failed: number; total: number }> = {};

  // ─── 1. Streak reminders ─────────────────────────────
  const { data: streakSubs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("notify_streak", true);
  const allStreakSubs = (streakSubs || []).map((r: Record<string, unknown>) => fromRow<PushSubscriptionRow>(r));

  if (allStreakSubs.length > 0) {
    const activeToday = await getUsersWithNoInteractionToday();
    // Only send to users who HAVEN'T logged an interaction today
    const needsReminder = allStreakSubs.filter((s) => !activeToday.has(s.userId));

    const streakPayload = JSON.stringify({
      title: "Maintiens ton streak !",
      body: "Tu n'as pas encore loggé d'interaction aujourd'hui. Une seule suffit pour garder ta flamme !",
      tag: "streak-reminder",
      url: "/interactions/new",
    });

    const streakResult = await sendToSubs(needsReminder, streakPayload);
    results.streak = { ...streakResult, total: needsReminder.length };
  }

  // ─── 2. Mission reminders ────────────────────────────
  const { data: missionSubs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("notify_missions", true);
  const allMissionSubs = (missionSubs || []).map((r: Record<string, unknown>) => fromRow<PushSubscriptionRow>(r));

  if (allMissionSubs.length > 0) {
    const missionPayload = JSON.stringify({
      title: "Missions en cours",
      body: "Tu as des missions actives qui arrivent bientôt à échéance. Vérifie ta progression !",
      tag: "mission-reminder",
      url: "/missions",
    });

    const missionResult = await sendToSubs(allMissionSubs, missionPayload);
    results.missions = { ...missionResult, total: allMissionSubs.length };
  }

  // ─── 3. Weekly recap (Sundays only) ──────────────────
  if (isSunday()) {
    const { data: weeklySubs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("notify_weekly", true);
    const allWeeklySubs = (weeklySubs || []).map((r: Record<string, unknown>) => fromRow<PushSubscriptionRow>(r));

    if (allWeeklySubs.length > 0) {
      const weeklyPayload = JSON.stringify({
        title: "Récap de la semaine",
        body: "Ta semaine est terminée ! Consulte tes stats et prépare la suivante.",
        tag: "weekly-recap",
        url: "/reports",
      });

      const weeklyResult = await sendToSubs(allWeeklySubs, weeklyPayload);
      results.weekly = { ...weeklyResult, total: allWeeklySubs.length };
    }
  }

  return NextResponse.json({ ok: true, results });
}
