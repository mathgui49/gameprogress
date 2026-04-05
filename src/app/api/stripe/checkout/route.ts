import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fetchSubscription, upsertSubscription } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // Check if user already has a Stripe customer
  let sub = await fetchSubscription(userId);
  let customerId = sub?.stripeCustomerId;

  if (!customerId) {
    // Create Stripe customer
    const customer = await getStripe().customers.create({ email: userId, metadata: { userId } });
    customerId = customer.id;
    await upsertSubscription(userId, { stripeCustomerId: customerId, status: "inactive" });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancel`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
