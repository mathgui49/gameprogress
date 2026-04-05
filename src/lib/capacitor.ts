/**
 * Capacitor native bridge utilities.
 * Safe to import on web — all calls are no-ops when not running in a native app.
 */

import { Capacitor } from "@capacitor/core";

/** True when running inside the native Capacitor shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/** Current platform: "android" | "ios" | "web" */
export const platform = Capacitor.getPlatform();

/* ── Haptics ─────────────────────────────────────────── */

export async function hapticLight() {
  if (!isNative) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium() {
  if (!isNative) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticSuccess() {
  if (!isNative) return;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  await Haptics.notification({ type: NotificationType.Success });
}

/* ── Status Bar ──────────────────────────────────────── */

export async function setupStatusBar() {
  if (!isNative) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  await StatusBar.setStyle({ style: Style.Dark });
  if (platform === "android") {
    await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
  }
}

/* ── Splash Screen ───────────────────────────────────── */

export async function hideSplash() {
  if (!isNative) return;
  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide({ fadeOutDuration: 500 });
}

/* ── Push Notifications (native) ─────────────────────── */

export async function registerNativePush(): Promise<string | null> {
  if (!isNative) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;

  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      resolve(token.value);
    });
    PushNotifications.addListener("registrationError", () => {
      resolve(null);
    });
    PushNotifications.register();
  });
}

/* ── Deep Links / App URL Open ───────────────────────── */

export async function setupDeepLinks(handler: (url: string) => void) {
  if (!isNative) return;
  const { App } = await import("@capacitor/app");
  App.addListener("appUrlOpen", (event) => {
    handler(event.url);
  });
}
