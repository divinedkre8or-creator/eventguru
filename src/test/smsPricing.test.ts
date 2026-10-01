// src/test/smsPricing.test.ts
import { describe, it, expect } from "vitest";
import {
  getSmsUnitRate,
  calculateSmsOrderPrice,
  BASE_SMS_PRICE_NGN,
  TIER_1_SMS_PRICE_NGN,
  TIER_2_SMS_PRICE_NGN,
} from "../lib/smsPricing";

describe("smsPricing volume tiers", () => {
  describe("getSmsUnitRate", () => {
    it("charges ₦10/SMS for <= 100 SMS", () => {
      expect(getSmsUnitRate(1)).toBe(10);
      expect(getSmsUnitRate(50)).toBe(10);
      expect(getSmsUnitRate(100)).toBe(10);
    });

    it("charges ₦9/SMS for 101 to 500 SMS", () => {
      expect(getSmsUnitRate(101)).toBe(9);
      expect(getSmsUnitRate(250)).toBe(9);
      expect(getSmsUnitRate(500)).toBe(9);
    });

    it("charges ₦8/SMS for > 500 SMS (bulk orders)", () => {
      expect(getSmsUnitRate(501)).toBe(8);
      expect(getSmsUnitRate(1000)).toBe(8);
      expect(getSmsUnitRate(5000)).toBe(8);
    });
  });

  describe("calculateSmsOrderPrice", () => {
    it("calculates accurate total price for standard tier (<= 100 units)", () => {
      const order = calculateSmsOrderPrice(50);
      expect(order.units).toBe(50);
      expect(order.unitRate).toBe(10);
      expect(order.totalPriceNgn).toBe(500);
      expect(order.savingsNgn).toBe(0);
      expect(order.discountBadge).toBeUndefined();
    });

    it("calculates accurate total price and 10% savings for volume tier (101 - 500 units)", () => {
      const order = calculateSmsOrderPrice(200);
      expect(order.units).toBe(200);
      expect(order.unitRate).toBe(9);
      expect(order.totalPriceNgn).toBe(1800); // 200 * 9
      expect(order.savingsNgn).toBe(200); // 200 * 10 - 1800
      expect(order.discountBadge).toBe("10% Volume Discount");
    });

    it("calculates accurate total price and 20% savings for bulk tier (> 500 units)", () => {
      const order = calculateSmsOrderPrice(1000);
      expect(order.units).toBe(1000);
      expect(order.unitRate).toBe(8);
      expect(order.totalPriceNgn).toBe(8000); // 1000 * 8
      expect(order.savingsNgn).toBe(2000); // 1000 * 10 - 8000
      expect(order.discountBadge).toBe("20% Bulk Discount");
    });

    it("handles zero and negative inputs gracefully", () => {
      const order = calculateSmsOrderPrice(0);
      expect(order.units).toBe(0);
      expect(order.totalPriceNgn).toBe(0);

      const negativeOrder = calculateSmsOrderPrice(-25);
      expect(negativeOrder.units).toBe(0);
      expect(negativeOrder.totalPriceNgn).toBe(0);
    });
  });
});
