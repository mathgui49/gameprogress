import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchSubscription } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 30, 60);
  if (rl) return rl;

  // Verify the caller is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(null, { status: 401 });
  }

  // Only return subscription for the authenticated user
  const sub = await fetchSubscription(session.user.email);
  return NextResponse.json(sub);
}
