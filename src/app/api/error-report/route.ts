import { NextResponse } from "next/server";

/**
 * Simple error tracking endpoint.
 * Logs client errors server-side for debugging.
 * In production, this could forward to Sentry, LogFlare, etc.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, stack, digest, url, timestamp, userAgent } = body;

    // Log structured error for server-side observability
    console.error("[CLIENT_ERROR]", JSON.stringify({
      message: String(message ?? "").slice(0, 500),
      stack: String(stack ?? "").slice(0, 2000),
      digest: digest ?? null,
      url: String(url ?? "").slice(0, 500),
      timestamp,
      userAgent: String(userAgent ?? "").slice(0, 300),
    }));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
