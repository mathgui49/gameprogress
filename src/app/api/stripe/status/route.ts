import { NextRequest, NextResponse } from "next/server";
import { fetchSubscription } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json(null);

  const sub = await fetchSubscription(userId);
  return NextResponse.json(sub);
}
