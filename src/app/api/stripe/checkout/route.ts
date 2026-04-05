import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { fetchSubscription, upsertSubscription } from "@/lib/db";
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

  // Check if user already has a Stripe customer
  let sub = await fetchSubscription(userId);
  let customerId = sub?.stripeCustomerId;

  if (!customerId) {
    const customer = await getStripe().customers.create({ email: userId, metadata: { userId } });
    customerId = customer.id;
    await upsertSubscription(userId, { stripeCustomerId: customerId, status: "inactive" });
  }

  // Validate origin
  const origin = req.headers.get("origin") || "";
  const safeOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${safeOrigin}/settings?checkout=success`,
    cancel_url: `${safeOrigin}/settings?checkout=cancel`,
    metadata: { userId },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
