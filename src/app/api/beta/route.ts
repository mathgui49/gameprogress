import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { countBetaTesters, joinBeta } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

const BETA_MAX = 20;

/** GET — public: returns remaining spots */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 30, 60);
  if (rl) return rl;

  const count = await countBetaTesters();
  return NextResponse.json({ total: BETA_MAX, taken: count, remaining: BETA_MAX - count });
}

/** POST — authenticated: join beta program */
export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 5, 60);
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await joinBeta(session.user.email);
  if (!result.ok) {
    const messages: Record<string, string> = {
      already_active: "Tu as déjà un abonnement actif.",
      already_beta: "Tu fais déjà partie du programme beta.",
      full: "Le programme beta est complet.",
    };
    return NextResponse.json({ error: messages[result.reason!] || "Erreur" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
