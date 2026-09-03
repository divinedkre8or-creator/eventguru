/**
 * Converts a title into a clean, human-readable URL slug.
 * e.g. "Lagos Tech Summit 2026!" -> "lagos-tech-summit-2026"
 */
export const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special non-word characters except hyphens and spaces
    .replace(/[\s_-]+/g, "-")  // Replace spaces, underscores, and hyphens with single hyphen
    .replace(/^-+|-+$/g, "");   // Trim leading & trailing hyphens
};

/**
 * Returns a human-readable URL path for an event.
 * e.g. /events/lagos-tech-summit-2026
 */
export const getEventUrl = (event: { id: string; title: string }): string => {
  const slug = slugify(event.title);
  return slug ? `/events/${slug}` : `/events/${event.id}`;
};

/**
 * Returns a human-readable DP generator URL path for an event.
 * e.g. /events/lagos-tech-summit-2026/dp
 */
export const getEventDpUrl = (event: { id: string; title: string }): string => {
  const slug = slugify(event.title);
  return slug ? `/events/${slug}/dp` : `/events/${event.id}/dp`;
};
