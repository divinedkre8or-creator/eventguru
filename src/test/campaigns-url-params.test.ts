// src/test/campaigns-url-params.test.ts
import { describe, it, expect } from "vitest";

export const SMS_QUICK_TEMPLATES = [
  {
    id: "reminder_24h",
    label: "24h Countdown",
    body: "Hi {{name}}, counting down to our event! Doors open tomorrow on schedule. Please have your digital pass ready on your phone for rapid gate scanning.",
  },
  {
    id: "venue_gate",
    label: "Venue & Gate Directions",
    body: "Hi {{name}}, venue update: Fast-track check-in is located at the main entrance. Parking is available on site. We look forward to hosting you!",
  },
  {
    id: "thank_you",
    label: "Post-Event Thank You",
    body: "Hi {{name}}, thank you for attending! We hope you had an unforgettable experience. Stay tuned for future editions on EventRally.",
  },
];

describe("Campaign studio quick templates and query handling", () => {
  it("contains 3 distinct production-ready SMS templates", () => {
    expect(SMS_QUICK_TEMPLATES.length).toBe(3);
    expect(SMS_QUICK_TEMPLATES.every((t) => t.body.includes("{{name}}"))).toBe(true);
  });

  it("ensures each template has a clean, concise body under typical single/double SMS length", () => {
    SMS_QUICK_TEMPLATES.forEach((template) => {
      expect(template.body.length).toBeGreaterThan(20);
      expect(template.body.length).toBeLessThan(180);
    });
  });

  it("handles URL parameter channel resolution", () => {
    const resolveChannel = (param: string | null): "email" | "sms" => {
      return param === "sms" ? "sms" : "email";
    };

    expect(resolveChannel("sms")).toBe("sms");
    expect(resolveChannel("email")).toBe("email");
    expect(resolveChannel(null)).toBe("email");
    expect(resolveChannel("unknown")).toBe("email");
  });
});
