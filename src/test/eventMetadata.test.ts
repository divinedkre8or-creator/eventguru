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

  it("handles out-of-order tags where CUSTOM_QUESTIONS comes before ADDITIONAL_INFO without parse failure", () => {
    const raw = `Annual Tech Gala
|||CUSTOM_QUESTIONS|||[{"id":"q_size","prompt":"T-shirt size?","type":"dropdown","options":["S","M","L","XL"],"required":true}]
|||ADDITIONAL_INFO|||Please arrive 15 minutes before opening doors.
|||SCHEDULE|||[{"date":"2026-12-01","startTime":"08:30"}]`;

    const parsed = parseEventMetadata(raw);

    expect(parsed.cleanDescription).toBe("Annual Tech Gala");
    expect(parsed.customQuestions.length).toBe(1);
    expect(parsed.customQuestions[0].prompt).toBe("T-shirt size?");
    expect(parsed.customQuestions[0].options).toEqual(["S", "M", "L", "XL"]);
    expect(parsed.additionalInfo).toBe("Please arrive 15 minutes before opening doors.");
    expect(parsed.schedule.length).toBe(1);
  });

  it("hydrates custom questions from database row if stored as JSON string or array", () => {
    const eventRow = {
      event_type: "online",
      custom_questions: JSON.stringify([
        { id: "q1", prompt: "Your GitHub username?", type: "text", required: true },
      ]),
      additional_info: "Zoom credentials will be emailed.",
    };

    const parsed = parseEventMetadata("Online Hackathon", eventRow);

    expect(parsed.eventType).toBe("online");
    expect(parsed.customQuestions.length).toBe(1);
    expect(parsed.customQuestions[0].prompt).toBe("Your GitHub username?");
    expect(parsed.additionalInfo).toBe("Zoom credentials will be emailed.");
  });

  it("falls back to description tags if database row custom_questions is an empty array", () => {
    const raw = `Special Summit\n\n|||CUSTOM_QUESTIONS|||[{"id":"q1","prompt":"Company name?","type":"text","required":false}]`;
    const eventRow = {
      custom_questions: [], // Postgres default empty array
    };

    const parsed = parseEventMetadata(raw, eventRow);

    expect(parsed.customQuestions.length).toBe(1);
    expect(parsed.customQuestions[0].prompt).toBe("Company name?");
  });
});
