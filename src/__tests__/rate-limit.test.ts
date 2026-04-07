import { describe, it, expect, beforeEach } from "vitest";

// Re-implement rate limiter for isolated testing
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRate(userId: string, action: string, limit = 30, windowSec = 60) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return;
  }
  entry.count++;
  if (entry.count > limit) {
    throw new Error("Rate limit exceeded");
  }
}

describe("checkRate", () => {
  beforeEach(() => {
    rateBuckets.clear();
  });

  it("allows requests within limit", () => {
    for (let i = 0; i < 30; i++) {
      expect(() => checkRate("user1", "insert", 30, 60)).not.toThrow();
    }
  });

  it("blocks requests exceeding limit", () => {
    for (let i = 0; i < 30; i++) {
      checkRate("user1", "insert", 30, 60);
    }
    expect(() => checkRate("user1", "insert", 30, 60)).toThrow("Rate limit exceeded");
  });

  it("isolates rate limits per user", () => {
    for (let i = 0; i < 30; i++) {
      checkRate("user1", "insert", 30, 60);
    }
    // user2 should still be allowed
    expect(() => checkRate("user2", "insert", 30, 60)).not.toThrow();
  });

  it("isolates rate limits per action", () => {
    for (let i = 0; i < 30; i++) {
      checkRate("user1", "insert", 30, 60);
    }
    // Different action should still be allowed
    expect(() => checkRate("user1", "update", 30, 60)).not.toThrow();
  });

  it("respects custom limits", () => {
    for (let i = 0; i < 5; i++) {
      checkRate("user1", "ping", 5, 300);
    }
    expect(() => checkRate("user1", "ping", 5, 300)).toThrow("Rate limit exceeded");
  });
});
