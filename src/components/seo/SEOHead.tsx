import { useEffect } from "react";

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noIndex?: boolean;
  schema?: Record<string, any> | Record<string, any>[];
}

const DEFAULT_TITLE = "EventRally — Event Management, Ticketing & Viral Growth Platform";
const DEFAULT_DESCRIPTION =
  "Sell out tickets, automate door check-in, and turn attendees into a viral marketing team with custom event fliers. Free for free events.";
const DEFAULT_IMAGE = "/ER full logo.png";
const DOMAIN = "https://eventrally.com";

/**
 * Lightweight, zero-dependency client-side SEO utility.
 * Dynamically synchronizes document title, meta tags, canonical link,
 * and JSON-LD structured data on route changes.
 */
export const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  noIndex = false,
  schema,
}: SEOHeadProps) => {
  useEffect(() => {
    // 1. Title
    const finalTitle = title ? `${title} | EventRally` : DEFAULT_TITLE;
    document.title = finalTitle;

    // Helper to safely set/create meta tags
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Standard Meta Tags
    setMetaTag('meta[name="description"]', "name", "description", description);
    setMetaTag(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"
    );

    // 3. Canonical Link
    let canonicalHref = DOMAIN;
    if (canonicalPath) {
      canonicalHref = canonicalPath.startsWith("http") ? canonicalPath : `${DOMAIN}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`;
    } else if (typeof window !== "undefined") {
      canonicalHref = `${DOMAIN}${window.location.pathname}`;
    }

    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalHref);

    // 4. Open Graph Tags
    const fullImageUrl = ogImage.startsWith("http") ? ogImage : `${DOMAIN}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;
    setMetaTag('meta[property="og:title"]', "property", "og:title", finalTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:url"]', "property", "og:url", canonicalHref);
    setMetaTag('meta[property="og:image"]', "property", "og:image", fullImageUrl);

    // 5. Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", fullImageUrl);

    // 6. JSON-LD Structured Data
    const scriptId = "eventrally-jsonld-schema";
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = scriptId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Optional cleanup on component unmount
    };
  }, [title, description, canonicalPath, ogImage, ogType, noIndex, schema]);

  return null;
};
