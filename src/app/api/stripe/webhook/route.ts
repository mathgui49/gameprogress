import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { upsertSubscription } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await getStripe().subscriptions.retrieve(session.subscription as string) as any;
        const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
        await upsertSubscription(userId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = event.data.object as any;
      const customerId = subscription.customer as string;
      const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer.metadata?.userId;
      if (userId) {
        const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
        await upsertSubscription(userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer.metadata?.userId;
      if (userId) {
        await upsertSubscription(userId, { status: "past_due" });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
