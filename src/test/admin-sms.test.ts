// src/test/admin-sms.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateRemainingUnits,
  calculateSolvencyRatio,
  getCentralBalanceHealth,
  formatNaira,
  estimateDeliveryRate,
} from "../lib/smsCalculations";

describe("smsCalculations", () => {
  describe("calculateRemainingUnits", () => {
    it("calculates units accurately with default wholesale price", () => {
      // ₦37,500 / ₦3.75 = 10,000 units
      expect(calculateRemainingUnits(37500, 3.75)).toBe(10000);
      expect(calculateRemainingUnits(20, 3.75)).toBe(5);
    });

    it("handles zero and negative balances gracefully", () => {
      expect(calculateRemainingUnits(0)).toBe(0);
      expect(calculateRemainingUnits(-50)).toBe(0);
      expect(calculateRemainingUnits(null as any)).toBe(0);
      expect(calculateRemainingUnits(undefined as any)).toBe(0);
    });
  });

  describe("calculateSolvencyRatio", () => {
    it("calculates percentage of central balance covering organizer liabilities", () => {
      // ₦50,000 central balance covering ₦25,000 liabilities = 200%
      expect(calculateSolvencyRatio(50000, 25000)).toBe(200);

      // ₦10,000 central balance covering ₦20,000 liabilities = 50%
      expect(calculateSolvencyRatio(10000, 20000)).toBe(50);
    });

    it("returns 100% when there are zero liabilities", () => {
      expect(calculateSolvencyRatio(10000, 0)).toBe(100);
      expect(calculateSolvencyRatio(0, 0)).toBe(100);
    });

    it("handles zero central balance with active liabilities", () => {
      expect(calculateSolvencyRatio(0, 5000)).toBe(0);
    });
  });

  describe("getCentralBalanceHealth", () => {
    it("returns 'healthy' when above low threshold", () => {
      const health = getCentralBalanceHealth(15000, 5000, 2000);
      expect(health.status).toBe("healthy");
      expect(health.color).toContain("emerald");
    });

    it("returns 'warning' when between low and critical threshold", () => {
      const health = getCentralBalanceHealth(3500, 5000, 2000);
      expect(health.status).toBe("warning");
      expect(health.color).toContain("amber");
    });

    it("returns 'critical' when below critical threshold", () => {
      const health = getCentralBalanceHealth(1500, 5000, 2000);
      expect(health.status).toBe("critical");
      expect(health.color).toContain("red");
    });

    it("returns 'critical' for 0 or negative balance", () => {
      expect(getCentralBalanceHealth(0).status).toBe("critical");
      expect(getCentralBalanceHealth(-10).status).toBe("critical");
    });
  });

  describe("formatNaira", () => {
    it("formats currency with ₦ symbol and commas", () => {
      expect(formatNaira(1500)).toBe("₦1,500");
      expect(formatNaira(1500.5, true)).toBe("₦1,500.50");
      expect(formatNaira(0)).toBe("₦0");
    });
  });

  describe("estimateDeliveryRate", () => {
    it("calculates correct percentage of sent vs failed", () => {
      expect(estimateDeliveryRate(95, 5)).toBe(95);
      expect(estimateDeliveryRate(100, 0)).toBe(100);
      expect(estimateDeliveryRate(0, 10)).toBe(0);
      expect(estimateDeliveryRate(0, 0)).toBe(100);
    });
  });
});
