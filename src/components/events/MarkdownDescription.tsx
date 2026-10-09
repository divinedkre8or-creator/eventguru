import React from "react";

interface MarkdownDescriptionProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, robust parser that formats Markdown headings, subheadings,
 * bold text, bulleted lists, and paragraphs copied from ChatGPT or typed manually.
 */
export const MarkdownDescription: React.FC<MarkdownDescriptionProps> = ({
  content,
  className = "",
}) => {
  if (!content || !content.trim()) {
    return <p className="text-muted-foreground italic text-xs">No description provided.</p>;
  }

  // Split content by lines
  const rawLines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];

  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="list-disc pl-5 my-3 space-y-1.5 text-muted-foreground text-sm leading-relaxed">
          {currentList.map((item, idx) => (
            <li key={idx} className="pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Regex for bold **text** or __text__
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
    return parts.map((part, idx) => {
      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        return (
          <strong key={idx} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  rawLines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Check for bullet list item: starts with '- ', '* ', or '• '
    if (/^[-*•]\s+/.test(line)) {
      const cleanItem = line.replace(/^[-*•]\s+/, "");
      currentList.push(cleanItem);
      return;
    }

    // Numbered list item: starts with '1. ', '2. ', etc.
    if (/^\d+\.\s+/.test(line)) {
      const cleanItem = line.replace(/^\d+\.\s+/, "");
      currentList.push(cleanItem);
      return;
    }

    // If not a list item, flush any existing list
    flushList();

    // Empty line creates breathing room
    if (!line) {
      return;
    }

    // Heading 1 or 2: # Heading or ## Heading
    if (line.startsWith("# ") || line.startsWith("## ")) {
      const headingText = line.replace(/^#+\s*/, "");
      elements.push(
        <h2
          key={`h2-${idx}`}
          className="font-heading text-lg sm:text-xl font-black text-foreground mt-6 mb-2 tracking-tight first:mt-0"
        >
          {renderInline(headingText)}
        </h2>
      );
      return;
    }

    // Subheading: ### Heading or #### Heading
    if (line.startsWith("### ") || line.startsWith("#### ")) {
      const subHeadingText = line.replace(/^#+\s*/, "");
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="font-heading text-base font-bold text-foreground mt-4 mb-1.5 tracking-tight"
        >
          {renderInline(subHeadingText)}
        </h3>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-sm sm:text-base text-muted-foreground leading-relaxed my-2">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 font-sans ${className}`}>{elements}</div>;
};

export default MarkdownDescription;
