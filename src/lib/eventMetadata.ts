// src/lib/eventMetadata.ts
// Shared models and serialization utilities for Event Modality (Physical vs. Online)
// and DIY Custom Questions, ensuring 100% backward and forward compatibility with Supabase.

export type EventType = "physical" | "online";

export interface OnlineSettings {
  meeting_link: string; // e.g. Zoom, Google Meet, YouTube Live
  redirect_url: string; // e.g. WhatsApp Group, Telegram community
  access_instructions: string; // e.g. Passcode or joining notes
  auto_redirect: boolean; // default false
}

export type CustomQuestionType = "text" | "textarea" | "radio" | "dropdown" | "checkbox";

export interface CustomQuestion {
  id: string;
  prompt: string;
  label?: string; // alias for backwards and forward compatibility
  question?: string; // alias for backwards and forward compatibility
  type: CustomQuestionType;
  options: string[]; // choices for radio, dropdown, checkbox
  required: boolean;
  placeholder?: string;
}

export type CustomAnswers = Record<string, string | string[]>;

export interface ScheduleDay {
  date: string;
  startTime: string;
  endTime?: string;
}

export interface ParsedEventMetadata {
  cleanDescription: string;
  eventType: EventType;
  onlineSettings: OnlineSettings;
  customQuestions: CustomQuestion[];
  brandColor: string;
  additionalInfo: string;
  schedule: ScheduleDay[];
}

export const DEFAULT_ONLINE_SETTINGS: OnlineSettings = {
  meeting_link: "",
  redirect_url: "",
  access_instructions: "",
  auto_redirect: false,
};

/**
 * Standard delimiter tags used for non-destructive metadata packing in event description
 */
const TAGS = {
  SCHEDULE: "|||SCHEDULE|||",
  ADDITIONAL_INFO: "|||ADDITIONAL_INFO|||",
  BRAND_COLOR: "|||BRAND_COLOR|||",
  EVENT_TYPE: "|||EVENT_TYPE|||",
  ONLINE_SETTINGS: "|||ONLINE_SETTINGS|||",
  CUSTOM_QUESTIONS: "|||CUSTOM_QUESTIONS|||",
};

/**
 * Parse raw event description and database fields into structured event metadata.
 * Gracefully handles legacy events, missing tags, and corrupted JSON.
 */
export function parseEventMetadata(rawDesc: string | null | undefined, eventRow?: any): ParsedEventMetadata {
  let content = (rawDesc || "").trim();
  let brandColor = "";
  let additionalInfo = "";
  let schedule: ScheduleDay[] = [];
  let eventType: EventType = eventRow?.event_type === "online" ? "online" : "physical";
  let onlineSettings: OnlineSettings = { ...DEFAULT_ONLINE_SETTINGS };
  let customQuestions: CustomQuestion[] = [];

  const normalizeQuestions = (arr: any[]): CustomQuestion[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((q, idx) => {
      const text = (q.prompt || q.label || q.question || "").trim();
      return {
        id: q.id || `q_${idx}`,
        prompt: text || `Question ${idx + 1}`,
        label: text || `Question ${idx + 1}`,
        question: text || `Question ${idx + 1}`,
        type: q.type || "text",
        options: Array.isArray(q.options) ? q.options : [],
        required: Boolean(q.required),
        placeholder: q.placeholder || "",
      };
    });
  };

  // 1. Database column direct hydration (if table has migrations applied)
  if (eventRow) {
    if (eventRow.meeting_link || eventRow.redirect_url || eventRow.access_instructions !== undefined) {
      onlineSettings = {
        meeting_link: eventRow.meeting_link || "",
        redirect_url: eventRow.redirect_url || "",
        access_instructions: eventRow.access_instructions || "",
        auto_redirect: Boolean(eventRow.auto_redirect),
      };
    }
    if (Array.isArray(eventRow.custom_questions)) {
      customQuestions = normalizeQuestions(eventRow.custom_questions);
    }
  }

  // 2. Extract brand color
  if (content.includes(TAGS.BRAND_COLOR)) {
    const parts = content.split(TAGS.BRAND_COLOR);
    content = parts[0].trim();
    brandColor = (parts[1] || "").trim();
  }

  // 3. Extract custom questions
  if (content.includes(TAGS.CUSTOM_QUESTIONS)) {
    const parts = content.split(TAGS.CUSTOM_QUESTIONS);
    content = parts[0].trim();
    try {
      const parsed = JSON.parse(parts[1]);
      if (Array.isArray(parsed) && customQuestions.length === 0) {
        customQuestions = normalizeQuestions(parsed);
      }
    } catch (e) {
      console.warn("Failed to parse custom questions metadata", e);
    }
  }

  // 4. Extract online settings
  if (content.includes(TAGS.ONLINE_SETTINGS)) {
    const parts = content.split(TAGS.ONLINE_SETTINGS);
    content = parts[0].trim();
    try {
      const parsed = JSON.parse(parts[1]);
      onlineSettings = {
        meeting_link: parsed.meeting_link || onlineSettings.meeting_link,
        redirect_url: parsed.redirect_url || onlineSettings.redirect_url,
        access_instructions: parsed.access_instructions || onlineSettings.access_instructions,
        auto_redirect: Boolean(parsed.auto_redirect ?? onlineSettings.auto_redirect),
      };
    } catch (e) {
      console.warn("Failed to parse online settings metadata", e);
    }
  }

  // 5. Extract event type
  if (content.includes(TAGS.EVENT_TYPE)) {
    const parts = content.split(TAGS.EVENT_TYPE);
    content = parts[0].trim();
    const parsedType = (parts[1] || "").trim().toLowerCase();
    if (parsedType === "online" || parsedType === "physical") {
      eventType = parsedType;
    }
  }

  // 6. Extract additional info
  if (content.includes(TAGS.ADDITIONAL_INFO)) {
    const parts = content.split(TAGS.ADDITIONAL_INFO);
    content = parts[0].trim();
    additionalInfo = (parts[1] || "").trim();
  }

  // 7. Extract schedule
  if (content.includes(TAGS.SCHEDULE)) {
    const parts = content.split(TAGS.SCHEDULE);
    content = parts[0].trim();
    try {
      const parsed = JSON.parse(parts[1]);
      if (Array.isArray(parsed)) {
        schedule = parsed;
      }
    } catch (e) {
      console.warn("Failed to parse schedule metadata", e);
    }
  }

  return {
    cleanDescription: content,
    eventType,
    onlineSettings,
    customQuestions,
    brandColor,
    additionalInfo,
    schedule,
  };
}

/**
 * Serialize all event metadata into the description text payload,
 * preserving clean human-readable text at the top while packing structured metadata safely.
 */
export function serializeEventDescription(metadata: {
  cleanDescription: string;
  eventType?: EventType;
  onlineSettings?: Partial<OnlineSettings>;
  customQuestions?: CustomQuestion[];
  brandColor?: string;
  additionalInfo?: string;
  schedule?: ScheduleDay[];
}): string {
  let result = (metadata.cleanDescription || "").trim();

  // Schedule
  if (metadata.schedule && metadata.schedule.length > 0) {
    result += `\n\n${TAGS.SCHEDULE}${JSON.stringify(metadata.schedule)}`;
  }

  // Additional Info
  if (metadata.additionalInfo && metadata.additionalInfo.trim()) {
    result += `\n\n${TAGS.ADDITIONAL_INFO}${metadata.additionalInfo.trim()}`;
  }

  // Event Type
  if (metadata.eventType) {
    result += `\n\n${TAGS.EVENT_TYPE}${metadata.eventType}`;
  }

  // Online Settings
  if (metadata.eventType === "online" && metadata.onlineSettings) {
    result += `\n\n${TAGS.ONLINE_SETTINGS}${JSON.stringify({
      meeting_link: metadata.onlineSettings.meeting_link || "",
      redirect_url: metadata.onlineSettings.redirect_url || "",
      access_instructions: metadata.onlineSettings.access_instructions || "",
      auto_redirect: Boolean(metadata.onlineSettings.auto_redirect),
    })}`;
  }

  // Custom Questions
  if (metadata.customQuestions && metadata.customQuestions.length > 0) {
    result += `\n\n${TAGS.CUSTOM_QUESTIONS}${JSON.stringify(metadata.customQuestions)}`;
  }

  // Brand Color
  if (metadata.brandColor && metadata.brandColor.trim()) {
    result += `\n\n${TAGS.BRAND_COLOR}${metadata.brandColor.trim()}`;
  }

  return result.trim();
}
