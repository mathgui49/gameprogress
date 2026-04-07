/**
 * Centralized error reporting.
 * Currently sends to /api/error-report. To integrate Sentry:
 *   1. npm install @sentry/nextjs
 *   2. Replace reportError body with Sentry.captureException(error, { extra: context })
 */

interface ErrorContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[${context?.component ?? "app"}]`, err.message, context);

  if (typeof window === "undefined") return;

  try {
    fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: err.message,
        stack: err.stack?.slice(0, 2000),
        url: window.location.href,
        timestamp: new Date().toISOString(),
        ...context,
      }),
    }).catch(() => {});
  } catch {
    // Reporting itself should never throw
  }
}
