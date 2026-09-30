// src/test/eventMetadata.test.ts
import { describe, it, expect } from "vitest";
import {
  parseEventMetadata,
  serializeEventDescription,
  CustomQuestion,
  OnlineSettings,
} from "../lib/eventMetadata";

describe("eventMetadata parser and serializer", () => {
  it("handles plain descriptions without tags", () => {
    const raw = "This is a simple conference event description.";
    const parsed = parseEventMetadata(raw);

    expect(parsed.cleanDescription).toBe(raw);
    expect(parsed.eventType).toBe("physical");
    expect(parsed.customQuestions).toEqual([]);
    expect(parsed.onlineSettings.meeting_link).toBe("");
    expect(parsed.onlineSettings.auto_redirect).toBe(false);
  });

  it("correctly serializes and parses online events with custom questions", () => {
    const questions: CustomQuestion[] = [
      {
        id: "q1",
        prompt: "Who invited you?",
        type: "text",
        options: [],
        required: true,
      },
      {
        id: "q2",
        prompt: "How did you hear about us?",
        type: "dropdown",
        options: ["Twitter/X", "Instagram", "Friend", "Billboard"],
        required: false,
      },
    ];

    const onlineSettings: OnlineSettings = {
      meeting_link: "https://zoom.us/j/123456789",
      redirect_url: "https://chat.whatsapp.com/samplegroup123",
      access_instructions: "Password is TECH2026",
      auto_redirect: false,
    };

    const serialized = serializeEventDescription({
      cleanDescription: "Welcome to the online global developer summit.",
      eventType: "online",
      onlineSettings,
      customQuestions: questions,
      brandColor: "#0058BE",
      additionalInfo: "Replays will be emailed to ticket holders.",
      schedule: [{ date: "2026-11-15", startTime: "10:00", endTime: "14:00" }],
    });

    const parsed = parseEventMetadata(serialized);

    expect(parsed.cleanDescription).toBe("Welcome to the online global developer summit.");
    expect(parsed.eventType).toBe("online");
    expect(parsed.onlineSettings.meeting_link).toBe("https://zoom.us/j/123456789");
    expect(parsed.onlineSettings.redirect_url).toBe("https://chat.whatsapp.com/samplegroup123");
    expect(parsed.onlineSettings.access_instructions).toBe("Password is TECH2026");
    expect(parsed.onlineSettings.auto_redirect).toBe(false);
    expect(parsed.customQuestions.length).toBe(2);
    expect(parsed.customQuestions[0].prompt).toBe("Who invited you?");
    expect(parsed.customQuestions[1].options).toContain("Twitter/X");
    expect(parsed.brandColor).toBe("#0058BE");
    expect(parsed.additionalInfo).toBe("Replays will be emailed to ticket holders.");
    expect(parsed.schedule.length).toBe(1);
  });

  it("handles legacy description containing only schedule and brand color", () => {
    const legacy = "Legacy Lagos Tech Meetup\n\n|||SCHEDULE|||[{\"date\":\"2026-10-10\",\"startTime\":\"09:00\"}]\n\n|||BRAND_COLOR|||#E11D48";
    const parsed = parseEventMetadata(legacy);

    expect(parsed.cleanDescription).toBe("Legacy Lagos Tech Meetup");
    expect(parsed.eventType).toBe("physical");
    expect(parsed.brandColor).toBe("#E11D48");
    expect(parsed.schedule.length).toBe(1);
    expect(parsed.customQuestions).toEqual([]);
  });
});
