import React, { useState, useRef } from "react";
import { 
  Heading1, Heading2, Heading3, Bold, List, ListOrdered, 
  Wand2, Eye, Edit3, Check, Sparkles, HelpCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownDescription } from "./MarkdownDescription";

interface RichDescriptionEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Intelligent Description Editor tailored for event conveners and organizers.
 * Supports Markdown headings, subheadings, bullet lists, numbered lists, bold text,
 * live preview, and 1-click ChatGPT text normalization.
 */
export const RichDescriptionEditor: React.FC<RichDescriptionEditorProps> = ({
  value,
  onChange,
  placeholder = "Write or paste your event description...",
  className = "",
}) => {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [justFormatted, setJustFormatted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Insert markdown syntax at current cursor position or wrap selection
   */
  const insertSyntax = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;

    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let newText = "";
    let newCursorPos = start + prefix.length;

    if (selected) {
      newText = before + prefix + selected + suffix + after;
      newCursorPos = start + prefix.length + selected.length + suffix.length;
    } else {
      // If no text is selected, just insert the prefix
      newText = before + prefix + suffix + after;
      newCursorPos = start + prefix.length;
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Automatically formats raw text copied from ChatGPT / Claude / AI prompts:
   * 1. Strips conversational intros ("Sure! Here is a description for your event:")
   * 2. Strips conversational outros ("Hope this helps! Let me know if you need changes.")
   * 3. Normalizes headers like "About the Event:" or "**Overview:**" into "## Overview"
   * 4. Converts bullets like "•", "*", "o" to clean "- "
   * 5. Ensures clean line breaks between headings and paragraphs
   */
  const handleAutoFormatChatGPT = () => {
    if (!value || !value.trim()) return;

    let text = value;

    // 1. Remove common conversational intros from ChatGPT
    text = text.replace(
      /^(sure[!,.]?|here['’]s|here is|certainly[!,.]?|of course[!,.]?)\s+(a|an|the|your)?\s*(compelling|detailed|sample|great)?\s*(event\s+description|description|writeup)[^:\n]*:?\s*\n+/i,
      ""
    );

    // 2. Remove common conversational outros
    text = text.replace(
      /\n+(let me know|feel free to|hope this helps|reach out if|customise this|customize this)[^\n]*$/i,
      ""
    );

    const lines = text.split(/\r?\n/);
    const formattedLines: string[] = [];

    // Common section headers used in event descriptions
    const sectionKeywords = [
      "About the Event", "Event Overview", "Overview", "About This Event",
      "What to Expect", "Key Highlights", "Highlights", "Event Schedule", "Agenda",
      "Who Should Attend", "Target Audience", "Why Attend", "Why You Should Attend",
      "Speakers", "Keynote Speakers", "Featured Guests", "Special Guests",
      "Dress Code", "Ticket Information", "Venue & Directions", "Location & Parking",
      "Important Notice", "Guidelines", "Rules & Regulations", "Contact Information"
    ];

    lines.forEach((line) => {
      let trimmed = line.trim();

      if (!trimmed) {
        formattedLines.push("");
        return;
      }

      // Check if line is a known section keyword wrapped in bold or trailing colon
      const cleanKeyword = trimmed.replace(/^\*\*|\*\*$/g, "").replace(/:$/, "").trim();
      const isKnownHeader = sectionKeywords.some(
        (kw) => kw.toLowerCase() === cleanKeyword.toLowerCase()
      );

      if (isKnownHeader) {
        formattedLines.push("");
        formattedLines.push(`## ${cleanKeyword}`);
        formattedLines.push("");
        return;
      }

      // If line is already markdown header (# or ## or ###)
      if (/^#{1,3}\s+/.test(trimmed)) {
        formattedLines.push("");
        formattedLines.push(trimmed);
        formattedLines.push("");
        return;
      }

      // Convert stray bullet icons (•, ●, ▪, o, *, -) to clean markdown "- "
      if (/^[•●▪*o]\s+/.test(trimmed)) {
        const item = trimmed.replace(/^[•●▪*o]\s+/, "");
        formattedLines.push(`- ${item}`);
        return;
      }

      // Numbered list item
      if (/^\d+[.)]\s+/.test(trimmed)) {
        const item = trimmed.replace(/^\d+[.)]\s+/, "");
        const num = trimmed.match(/^\d+/)?.[0] || "1";
        formattedLines.push(`${num}. ${item}`);
        return;
      }

      // Normal paragraph line
      formattedLines.push(trimmed);
    });

    // Collapse 3+ consecutive newlines into 2
    let result = formattedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    onChange(result);
    setJustFormatted(true);
    setTimeout(() => setJustFormatted(false), 3000);
  };

  return (
    <div className={`space-y-2 font-sans ${className}`}>
      {/* Formatting & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/60 border border-border rounded-xl">
        {/* Formatting buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertSyntax("\n## ", "\n")}
            className="h-8 px-2.5 text-xs font-bold text-foreground hover:bg-muted"
            title="Heading (##)"
          >
            <Heading2 className="w-3.5 h-3.5 mr-1 text-primary" />
            <span>Heading</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertSyntax("\n### ", "\n")}
            className="h-8 px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            title="Subheading (###)"
          >
            <Heading3 className="w-3.5 h-3.5 mr-1 text-primary" />
            <span>Subheading</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertSyntax("**", "**")}
            className="h-8 px-2 text-xs font-bold text-foreground hover:bg-muted"
            title="Bold text"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertSyntax("\n- ", "")}
            className="h-8 px-2 text-xs font-medium text-foreground hover:bg-muted"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertSyntax("\n1. ", "")}
            className="h-8 px-2 text-xs font-medium text-foreground hover:bg-muted"
            title="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>

          {/* 1-Click ChatGPT Auto-Formatter */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAutoFormatChatGPT}
            disabled={!value || !value.trim()}
            className="h-8 px-3 text-xs font-bold gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all ml-1"
            title="Format text copied from ChatGPT into structured headings and bullet points"
          >
            {justFormatted ? (
              <>
                <Check className="w-3.5 h-3.5 text-chart-green" />
                <span className="text-chart-green">Formatted</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Format Text</span>
              </>
            )}
          </Button>
        </div>

        {/* Edit / Preview Tabs */}
        <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              mode === "edit"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              mode === "preview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {mode === "edit" ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={8}
            className="bg-background border-border text-foreground font-sans text-sm leading-relaxed p-4 rounded-xl resize-y min-h-[180px] focus-visible:ring-primary"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 px-1 font-mono">
            <span>Supports Markdown: ## Heading, **Bold**, - Bullets</span>
            <span>{value ? `${value.length} characters` : "0 characters"}</span>
          </div>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl p-5 min-h-[180px] space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
            LIVE EVENT PAGE PREVIEW
          </div>
          <MarkdownDescription content={value} />
        </div>
      )}
    </div>
  );
};
