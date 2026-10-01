// src/test/phoneUtils.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatBrandedSms,
  calculateSmsSegments,
} from "../lib/phoneUtils";

describe("phoneUtils", () => {
  it("normalizes local Nigerian phone number to international 234 format", () => {
    expect(normalizePhoneNumber("08031234567")).toBe("2348031234567");
    expect(normalizePhoneNumber("+234 803 123 4567")).toBe("2348031234567");
    expect(normalizePhoneNumber("234-803-123-4567")).toBe("2348031234567");
    expect(normalizePhoneNumber("09012345678")).toBe("2349012345678");
  });

  it("normalizes to local format when toInternational is false", () => {
    expect(normalizePhoneNumber("+2348031234567", false)).toBe("08031234567");
    expect(normalizePhoneNumber("08031234567", false)).toBe("08031234567");
  });

  it("validates mobile phone numbers correctly", () => {
    expect(isValidPhoneNumber("08031234567")).toBe(true);
    expect(isValidPhoneNumber("+2348031234567")).toBe(true);
    expect(isValidPhoneNumber("123")).toBe(false);
    expect(isValidPhoneNumber("")).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });

  it("formats branded SMS messages with default and custom tags", () => {
    expect(formatBrandedSms("EventRally", "Your ticket pass is EVR-1001")).toBe(
      "[EventRally] Your ticket pass is EVR-1001"
    );
    expect(formatBrandedSms("TechSummit", "Doors open at 9am")).toBe(
      "[TechSummit] Doors open at 9am"
    );
    // Does not duplicate existing bracketed tag
    expect(formatBrandedSms("EventRally", "[CustomTag] Already tagged")).toBe(
      "[CustomTag] Already tagged"
    );
  });

  it("calculates single and multi-segment SMS character counts correctly", () => {
    const single = calculateSmsSegments("Short message under 160 characters");
    expect(single.segments).toBe(1);
    expect(single.charCount).toBe(34);
    expect(single.charsRemainingInSegment).toBe(126);

    const longMsg = "A".repeat(200);
    const multi = calculateSmsSegments(longMsg);
    expect(multi.segments).toBe(2);
    expect(multi.charCount).toBe(200);
  });
});
