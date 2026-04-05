import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchSubscription } from "@/lib/db";

export async function GET() {
  // Verify the caller is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(null, { status: 401 });
  }

  // Only return subscription for the authenticated user
  const sub = await fetchSubscription(session.user.email);
  return NextResponse.json(sub);
}
