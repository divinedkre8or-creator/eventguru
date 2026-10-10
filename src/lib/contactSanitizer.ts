export interface SanitizedRecipient {
  phone: string;
  name: string;
}

export interface SanitizationResult {
  validRecipients: SanitizedRecipient[];
  duplicateCount: number;
  invalidCount: number;
  totalParsed: number;
}

/**
 * Normalizes a raw phone number string to an international MSISDN format (e.g., 2348012345678).
 */
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  // Remove spaces, hyphens, brackets, dots
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Handle Nigerian local format (080..., 070..., 090..., 091..., 081...)
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  } else if (/^[789][01]\d{8}$/.test(cleaned)) {
    // Missing leading zero (e.g., 8031234567)
    cleaned = "234" + cleaned;
  }

  // Validate digit count: international phone numbers are between 10 and 15 digits
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Parses raw text input (comma, newline, semicolon, or space-separated numbers).
 */
export function parseRawPhoneText(text: string): SanitizationResult {
  if (!text || !text.trim()) {
    return { validRecipients: [], duplicateCount: 0, invalidCount: 0, totalParsed: 0 };
  }

  // Split by newlines, commas, semicolons
  const lines = text.split(/[\r\n,;]+/);
  const seen = new Set<string>();
  const validRecipients: SanitizedRecipient[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;
  let totalParsed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    totalParsed++;

    // Check if format is "Name <phone>" or "phone, name" or "phone"
    let extractedPhone = trimmed;
    let extractedName = "";

    const namePhoneMatch = trimmed.match(/^(.*?)\s*[\(<\[]?([+0-9]{10,15})[\)>\]]?$/);
    if (namePhoneMatch) {
      extractedName = namePhoneMatch[1].replace(/[:,\-]/g, "").trim();
      extractedPhone = namePhoneMatch[2].trim();
    }

    const normalized = normalizePhoneNumber(extractedPhone);
    if (!normalized) {
      invalidCount++;
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount++;
      continue;
    }

    seen.add(normalized);
    validRecipients.push({
      phone: normalized,
      name: extractedName,
    });
  }

  return {
    validRecipients,
    duplicateCount,
    invalidCount,
    totalParsed,
  };
}

/**
 * Parses CSV / TXT text with optional headers.
 */
export function parseCsvContacts(csvContent: string): SanitizationResult {
  if (!csvContent || !csvContent.trim()) {
    return { validRecipients: [], duplicateCount: 0, invalidCount: 0, totalParsed: 0 };
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { validRecipients: [], duplicateCount: 0, invalidCount: 0, totalParsed: 0 };
  }

  // Detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(";")
      ? ";"
      : ",";

  const rows = lines.map((l) =>
    l.split(delimiter).map((col) => col.replace(/^["']|["']$/g, "").trim())
  );

  let phoneColIndex = -1;
  let nameColIndex = -1;

  // Check headers in first row
  const headerRow = rows[0].map((h) => h.toLowerCase());
  const phoneAliases = ["phone", "mobile", "tel", "telephone", "contact", "phone_number", "phonenumber", "number", "gsm", "cell"];
  const nameAliases = ["name", "full_name", "fullname", "first_name", "firstname", "contact_name", "recipient"];

  phoneColIndex = headerRow.findIndex((col) => phoneAliases.some((alias) => col.includes(alias)));
  nameColIndex = headerRow.findIndex((col) => nameAliases.some((alias) => col.includes(alias)));

  let startIndex = 0;
  if (phoneColIndex !== -1) {
    startIndex = 1; // Row 0 is header
  } else {
    // If no header matched, inspect the first row columns to find which looks like a phone number
    const potentialCol = rows[0].findIndex((val) => normalizePhoneNumber(val) !== null);
    if (potentialCol !== -1) {
      phoneColIndex = potentialCol;
      nameColIndex = potentialCol === 0 && rows[0].length > 1 ? 1 : 0;
      startIndex = 0;
    } else {
      phoneColIndex = 0;
      startIndex = 0;
    }
  }

  const seen = new Set<string>();
  const validRecipients: SanitizedRecipient[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;
  let totalParsed = 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;
    totalParsed++;

    const rawPhone = row[phoneColIndex] || "";
    const rawName = nameColIndex !== -1 && nameColIndex !== phoneColIndex ? row[nameColIndex] || "" : "";

    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized) {
      invalidCount++;
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount++;
      continue;
    }

    seen.add(normalized);
    validRecipients.push({
      phone: normalized,
      name: rawName,
    });
  }

  return {
    validRecipients,
    duplicateCount,
    invalidCount,
    totalParsed,
  };
}
