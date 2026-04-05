"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getExistingSubscription,
  subscribePush,
  unsubscribePush,
  serializeSubscription,
} from "@/lib/pushNotifications";
import {
  upsertPushSubscriptionAction,
  updatePushPreferencesAction,
  deletePushSubscriptionAction,
  getPushSubscriptionAction,
} from "@/actions/db";
import type { NotifyPreferences } from "@/lib/db";

interface PushState {
  supported: boolean;
  subscribed: boolean;
  loading: boolean;
  prefs: NotifyPreferences;
}

const DEFAULT_PREFS: NotifyPreferences = {
  notifyStreak: true,
  notifyMissions: true,
  notifyWeekly: true,
};

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    subscribed: false,
    loading: true,
    prefs: DEFAULT_PREFS,
  });

  // Load current state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = isPushSupported();
      if (!supported) {
        setState((s) => ({ ...s, supported: false, loading: false }));
        return;
      }

      const sub = await getExistingSubscription();
      if (cancelled) return;

      if (sub) {
        // Fetch stored preferences
        const stored = await getPushSubscriptionAction().catch(() => null);
        if (cancelled) return;
        setState({
          supported: true,
          subscribed: true,
          loading: false,
          prefs: stored
            ? { notifyStreak: stored.notifyStreak, notifyMissions: stored.notifyMissions, notifyWeekly: stored.notifyWeekly }
            : DEFAULT_PREFS,
        });
      } else {
        setState({ supported: true, subscribed: false, loading: false, prefs: DEFAULT_PREFS });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const subscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const sub = await subscribePush();
    if (!sub) {
      setState((s) => ({ ...s, loading: false }));
      return false;
    }
    const { endpoint, p256dh, authKey } = serializeSubscription(sub);
    await upsertPushSubscriptionAction(endpoint, p256dh, authKey, state.prefs);
    setState((s) => ({ ...s, subscribed: true, loading: false }));
    return true;
  }, [state.prefs]);

  const unsubscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const sub = await getExistingSubscription();
    if (sub) {
      const { endpoint } = serializeSubscription(sub);
      await deletePushSubscriptionAction(endpoint);
    }
    await unsubscribePush();
    setState((s) => ({ ...s, subscribed: false, loading: false, prefs: DEFAULT_PREFS }));
  }, []);

  const updatePrefs = useCallback(async (newPrefs: Partial<NotifyPreferences>) => {
    const merged = { ...state.prefs, ...newPrefs };
    setState((s) => ({ ...s, prefs: merged }));

    const sub = await getExistingSubscription();
    if (sub) {
      const { endpoint } = serializeSubscription(sub);
      await updatePushPreferencesAction(endpoint, merged);
    }
  }, [state.prefs]);

  return {
    supported: state.supported,
    subscribed: state.subscribed,
    loading: state.loading,
    prefs: state.prefs,
    subscribe,
    unsubscribe,
    updatePrefs,
  };
}
