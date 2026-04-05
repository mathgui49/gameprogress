import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isLoggedIn = !!session;
  const isLoginPage = nextUrl.pathname === "/login";
  const isLandingPage = nextUrl.pathname === "/landing";
  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isStripeWebhook = nextUrl.pathname.startsWith("/api/stripe/webhook");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  // Always allow auth API routes and Stripe webhooks
  if (isAuthRoute || isStripeWebhook) return NextResponse.next();

  // Allow landing page without auth
  if (isLandingPage) return NextResponse.next();

  // Block admin route for non-admin users (server-side)
  if (isAdminRoute && isLoggedIn && session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Redirect logged-in users away from login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Redirect unauthenticated users to login
  if (!isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-.*|manifest.json|.*\\.png$).*)"],
};
