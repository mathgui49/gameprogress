import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { fetchSubscription } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_ORIGINS = [
  "https://gameprogress.app",
  "http://localhost:3000",
];

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 5, 60);
  if (rl) return rl;

  // Verify the caller is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the authenticated user's email — ignore any userId from the body
  const userId = session.user.email;

  const sub = await fetchSubscription(userId);
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") || "";
  const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${safeOrigin}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
