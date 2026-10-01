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
  const content = (rawDesc || "").trim();
  let brandColor = "";
  let additionalInfo = "";
  let schedule: ScheduleDay[] = [];
  let eventType: EventType = "physical";
  let onlineSettings: OnlineSettings = { ...DEFAULT_ONLINE_SETTINGS };
  let customQuestions: CustomQuestion[] = [];

  const normalizeQuestions = (arr: any[]): CustomQuestion[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((q) => q && typeof q === "object")
      .map((q, idx) => {
        const text = (q.prompt || q.label || q.question || q.title || q.name || "").trim();
        return {
          id: String(q.id || `q_${idx + 1}`),
          prompt: text || `Question ${idx + 1}`,
          label: text || `Question ${idx + 1}`,
          question: text || `Question ${idx + 1}`,
          type: (q.type || "text") as CustomQuestionType,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          required: Boolean(q.required),
          placeholder: q.placeholder || "",
        };
      });
  };

  // 1. Direct database column extraction (if migrations or columns exist on eventRow)
  if (eventRow) {
    if (eventRow.event_type === "online") {
      eventType = "online";
    }
    if (eventRow.meeting_link || eventRow.redirect_url || eventRow.access_instructions !== undefined) {
      onlineSettings = {
        meeting_link: eventRow.meeting_link || "",
        redirect_url: eventRow.redirect_url || "",
        access_instructions: eventRow.access_instructions || "",
        auto_redirect: Boolean(eventRow.auto_redirect),
      };
    }
    if (eventRow.brand_color) {
      brandColor = String(eventRow.brand_color).trim();
    }
    if (eventRow.additional_info || eventRow.additionalInfo) {
      additionalInfo = String(eventRow.additional_info || eventRow.additionalInfo).trim();
    }

    // Support custom_questions as array or JSON string
    let rowQuestions = eventRow.custom_questions ?? eventRow.customQuestions;
    if (typeof rowQuestions === "string" && rowQuestions.trim()) {
      try {
        rowQuestions = JSON.parse(rowQuestions);
      } catch (e) {
        // ignore malformed string
      }
    }
    if (Array.isArray(rowQuestions) && rowQuestions.length > 0) {
      customQuestions = normalizeQuestions(rowQuestions);
    }
  }

  // 2. Parse delimiter tags from description in ANY order
  // A tag block starts with |||TAG_NAME||| and continues until the next |||[A-Z_]+||| or end of string
  const tagRegex = /\|\|\|([A-Z_]+)\|\|\|([\s\S]*?)(?=(?:\|\|\|[A-Z_]+\|\|\||$))/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];
    const payload = (match[2] || "").trim();

    switch (tagName) {
      case "BRAND_COLOR":
        if (payload && !brandColor) {
          brandColor = payload;
        }
        break;

      case "EVENT_TYPE":
        if (payload.toLowerCase() === "online" || payload.toLowerCase() === "physical") {
          eventType = payload.toLowerCase() as EventType;
        }
        break;

      case "ADDITIONAL_INFO":
        if (payload && !additionalInfo) {
          additionalInfo = payload;
        }
        break;

      case "CUSTOM_QUESTIONS":
        if (customQuestions.length === 0 && payload) {
          try {
            const parsed = JSON.parse(payload);
            if (Array.isArray(parsed)) {
              customQuestions = normalizeQuestions(parsed);
            }
          } catch (e) {
            console.warn("Failed to parse custom questions metadata payload", e);
          }
        }
        break;

      case "ONLINE_SETTINGS":
        if (payload) {
          try {
            const parsed = JSON.parse(payload);
            onlineSettings = {
              meeting_link: parsed.meeting_link || onlineSettings.meeting_link,
              redirect_url: parsed.redirect_url || onlineSettings.redirect_url,
              access_instructions: parsed.access_instructions || onlineSettings.access_instructions,
              auto_redirect: Boolean(parsed.auto_redirect ?? onlineSettings.auto_redirect),
            };
          } catch (e) {
            console.warn("Failed to parse online settings metadata payload", e);
          }
        }
        break;

      case "SCHEDULE":
        if (schedule.length === 0 && payload) {
          try {
            const parsed = JSON.parse(payload);
            if (Array.isArray(parsed)) {
              schedule = parsed;
            }
          } catch (e) {
            console.warn("Failed to parse schedule metadata payload", e);
          }
        }
        break;
    }
  }

  // Extract clean human-readable description: everything before the first ||| tag
  const cleanDescription = content.split(/\|\|\|[A-Z_]+\|\|\|/)[0].trim();

  return {
    cleanDescription,
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
