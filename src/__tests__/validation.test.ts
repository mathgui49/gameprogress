import { describe, it, expect } from "vitest";

// Re-implement validation functions for unit testing (same logic as db.ts)
function assertString(val: unknown, name: string, maxLen = 5000): string {
  if (typeof val !== "string") throw new Error(`${name} must be a string`);
  if (val.length > maxLen) throw new Error(`${name} exceeds max length (${maxLen})`);
  return val;
}

function assertEnum<T extends string>(val: unknown, name: string, allowed: readonly T[]): T {
  if (!allowed.includes(val as T)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return val as T;
}

function assertInt(val: unknown, name: string, min = 0, max = 10000): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be integer ${min}-${max}`);
  return n;
}

function sanitizeObj<T>(obj: T): T {
  if (typeof obj === "string") return obj.replace(/<[^>]*>/g, "").trim() as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObj) as unknown as T;
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeObj(v);
    return out as T;
  }
  return obj;
}

describe("assertString", () => {
  it("accepts valid strings", () => {
    expect(assertString("hello", "test")).toBe("hello");
  });

  it("rejects non-strings", () => {
    expect(() => assertString(123, "test")).toThrow("must be a string");
    expect(() => assertString(null, "test")).toThrow("must be a string");
    expect(() => assertString(undefined, "test")).toThrow("must be a string");
  });

  it("rejects strings exceeding max length", () => {
    expect(() => assertString("a".repeat(101), "test", 100)).toThrow("exceeds max length");
  });
});

describe("assertEnum", () => {
  const allowed = ["a", "b", "c"] as const;

  it("accepts valid enum values", () => {
    expect(assertEnum("a", "test", allowed)).toBe("a");
  });

  it("rejects invalid enum values", () => {
    expect(() => assertEnum("d", "test", allowed)).toThrow("must be one of");
  });
});

describe("assertInt", () => {
  it("accepts valid integers", () => {
    expect(assertInt(5, "test", 0, 10)).toBe(5);
  });

  it("rejects floats", () => {
    expect(() => assertInt(5.5, "test")).toThrow("must be integer");
  });

  it("rejects out-of-range values", () => {
    expect(() => assertInt(-1, "test", 0, 10)).toThrow("must be integer");
    expect(() => assertInt(11, "test", 0, 10)).toThrow("must be integer");
  });

  it("converts string numbers", () => {
    expect(assertInt("5", "test", 0, 10)).toBe(5);
  });
});

describe("sanitizeObj", () => {
  it("strips HTML tags from strings", () => {
    expect(sanitizeObj("<script>alert('xss')</script>hello")).toBe("alert('xss')hello");
    expect(sanitizeObj("<b>bold</b>")).toBe("bold");
  });

  it("handles nested objects", () => {
    const input = { name: "<b>John</b>", bio: "<script>x</script>" };
    const result = sanitizeObj(input);
    expect(result.name).toBe("John");
    expect(result.bio).toBe("x");
  });

  it("handles arrays", () => {
    const input = ["<b>a</b>", "<i>b</i>"];
    expect(sanitizeObj(input)).toEqual(["a", "b"]);
  });

  it("preserves non-string values", () => {
    expect(sanitizeObj(42)).toBe(42);
    expect(sanitizeObj(null)).toBe(null);
    expect(sanitizeObj(true)).toBe(true);
  });

  it("handles deeply nested structures", () => {
    const input = { level1: { level2: { value: "<img onerror=alert(1)>test" } } };
    const result = sanitizeObj(input) as typeof input;
    expect(result.level1.level2.value).toBe("test");
  });
});
