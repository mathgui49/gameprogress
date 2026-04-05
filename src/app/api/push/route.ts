import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { getPushSubscriptionsByType } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

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

type NotificationType = "streak" | "missions" | "weekly";

const NOTIFICATION_PAYLOADS: Record<NotificationType, { title: string; body: string; tag: string; url: string }> = {
  streak: {
    title: "Maintiens ton streak !",
    body: "Tu n'as pas encore loggé d'interaction aujourd'hui. Une seule suffit pour garder ta flamme !",
    tag: "streak-reminder",
    url: "/interactions/new",
  },
  missions: {
    title: "Missions en cours",
    body: "Tu as des missions actives qui arrivent bientôt à échéance. Vérifie ta progression !",
    tag: "mission-reminder",
    url: "/missions",
  },
  weekly: {
    title: "Récap de la semaine",
    body: "Ta semaine est terminée ! Consulte tes stats et prépare la suivante.",
    tag: "weekly-recap",
    url: "/reports",
  },
};

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 5, 60);
  if (rl) return rl;

  const PUSH_SECRET = process.env.PUSH_CRON_SECRET ?? "";

  // Verify the request comes from our cron job
  const authHeader = req.headers.get("authorization");
  if (!PUSH_SECRET || authHeader !== `Bearer ${PUSH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureVapid();
  if (!vapidConfigured) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const { type } = (await req.json()) as { type: NotificationType };
  if (!NOTIFICATION_PAYLOADS[type]) {
    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  }

  const colName = `notify_${type}` as "notify_streak" | "notify_missions" | "notify_weekly";
  const subs = await getPushSubscriptionsByType(colName);
  const payload = JSON.stringify(NOTIFICATION_PAYLOADS[type]);

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.authKey },
          },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // Remove expired/invalid subscriptions (410 Gone or 404)
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          const { supabaseServer } = await import("@/lib/supabase-server");
          await supabaseServer.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }),
  );

  return NextResponse.json({ sent, failed, total: subs.length });
}
