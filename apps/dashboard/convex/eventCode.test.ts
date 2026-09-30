import { describe, expect, it } from "vitest";
import {
  canonicalizeEventCode,
  eventMatchesCode,
  normalizeEventCode,
} from "./eventCode";

describe("normalizeEventCode", () => {
  it("trims and uppercases the displayed code without reversing it", () => {
    expect(normalizeEventCode("  ieee2024  ")).toBe("IEEE2024");
  });

  it("does not treat a reversed code as the same value", () => {
    expect(normalizeEventCode("IEEE2024")).toBe("IEEE2024");
    expect(normalizeEventCode("4202EEEI")).toBe("4202EEEI");
    expect(normalizeEventCode("IEEE2024")).not.toBe(
      normalizeEventCode("4202EEEI"),
    );
  });
});

describe("canonicalizeEventCode", () => {
  it("strips punctuation but keeps character order", () => {
    expect(canonicalizeEventCode("ieee-2024")).toBe("IEEE2024");
    expect(canonicalizeEventCode("4202-EEEI")).toBe("4202EEEI");
  });
});

describe("eventMatchesCode", () => {
  const event = { _id: "events:abc123xyz", eventCode: "IEEE2024" };

  it("accepts the stored code typed in display order", () => {
    expect(eventMatchesCode(event, "IEEE2024", "IEEE2024")).toBe(true);
    expect(
      eventMatchesCode(
        event,
        normalizeEventCode("ieee-2024")!,
        canonicalizeEventCode("ieee-2024"),
      ),
    ).toBe(true);
  });

  it("rejects the stored code typed backwards", () => {
    expect(eventMatchesCode(event, "4202EEEI", "4202EEEI")).toBe(false);
  });

  it("matches the legacy EVENT-<last6> fallback only when no code is stored", () => {
    const legacy = { _id: "events:abc123xyz" };
    expect(eventMatchesCode(legacy, "EVENT-123XYZ", "EVENT123XYZ")).toBe(true);
    expect(eventMatchesCode(legacy, "ZYX321-TNEVE", "ZYX321TNEVE")).toBe(false);
    expect(eventMatchesCode(event, "EVENT-123XYZ", "EVENT123XYZ")).toBe(false);
  });
});
