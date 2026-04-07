import { describe, it, expect } from "vitest";
import { computeTotalXP, levelFromXP, xpForLevel, type XPEvent } from "@/lib/xp";

function makeEvent(overrides: Partial<XPEvent> = {}): XPEvent {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    category: "interaction",
    reason: "test",
    amount: 30,
    ...overrides,
  };
}

describe("xpForLevel", () => {
  it("returns 0 for level 0", () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it("returns increasing thresholds", () => {
    const l1 = xpForLevel(1);
    const l2 = xpForLevel(2);
    const l3 = xpForLevel(3);
    expect(l2).toBeGreaterThan(l1);
    expect(l3).toBeGreaterThan(l2);
  });
});

describe("levelFromXP", () => {
  it("returns level 1 for 0 XP (minimum level)", () => {
    expect(levelFromXP(0)).toBe(1);
  });

  it("returns correct level for given XP", () => {
    const threshold = xpForLevel(5);
    expect(levelFromXP(threshold)).toBeGreaterThanOrEqual(5);
    expect(levelFromXP(threshold - 1)).toBeLessThan(5);
  });
});

describe("computeTotalXP", () => {
  it("returns 0 for empty events", () => {
    expect(computeTotalXP([], new Date())).toBe(0);
  });

  it("computes XP from recent events", () => {
    const now = new Date();
    const events = [makeEvent({ date: now.toISOString(), amount: 30 })];
    const xp = computeTotalXP(events, now);
    expect(xp).toBeGreaterThan(0);
  });

  it("decays old events more than recent ones", () => {
    const now = new Date();
    const recentEvents = [makeEvent({ date: now.toISOString(), amount: 30 })];
    const oldEvents = [makeEvent({ date: new Date(Date.now() - 365 * 86400000).toISOString(), amount: 30 })];
    const recentXP = computeTotalXP(recentEvents, now);
    const oldXP = computeTotalXP(oldEvents, now);
    expect(recentXP).toBeGreaterThan(oldXP);
  });
});
