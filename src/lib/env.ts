import { z } from "zod";

/**
 * Validate all required environment variables at import time.
 * If any are missing, the app will fail fast with a clear error.
 *
 * Import this module in your root layout or instrumentation file
 * to ensure validation runs on app startup.
 */

const serverSchema = z.object({
  // Auth
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),

  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PRICE_ID: z.string().min(1, "STRIPE_PRICE_ID is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),

  // Push
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, "NEXT_PUBLIC_VAPID_PUBLIC_KEY is required"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required"),

  // Admin
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),

  // Optional
  PUSH_CRON_SECRET: z.string().optional(),
  VAPID_EMAIL: z.string().optional(),
  NEXT_PUBLIC_ADMIN_EMAIL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let _validated = false;

export function validateEnv(): ServerEnv {
  if (_validated) return process.env as unknown as ServerEnv;

  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n\nMissing or invalid environment variables:\n${missing}\n\nCheck your .env.local file.\n`
    );
  }

  _validated = true;
  return result.data;
}
