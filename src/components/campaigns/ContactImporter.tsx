import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Copy, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  parseCsvContacts,
  parseRawPhoneText,
  SanitizedRecipient,
  SanitizationResult,
} from "@/lib/contactSanitizer";
import { toast } from "sonner";

interface ContactImporterProps {
  onContactsChange: (recipients: SanitizedRecipient[]) => void;
  className?: string;
}

export const ContactImporter = ({ onContactsChange, className = "" }: ContactImporterProps) => {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<SanitizationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setResult(null);
      onContactsChange([]);
      return;
    }
    const res = parseRawPhoneText(text);
    setResult(res);
    onContactsChange(res.validRecipients);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = parseCsvContacts(content);
      setResult(res);
      onContactsChange(res.validRecipients);
      toast.success(
        `Imported ${res.validRecipients.length} valid contacts from ${file.name}`
      );
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setRawText("");
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onContactsChange([]);
  };

  return (
    <div className={`space-y-3.5 bg-muted/20 border border-border/80 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-secondary" /> Import Phone Contacts
        </label>
        <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === "paste"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === "upload"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {activeTab === "paste" ? (
        <div className="space-y-1.5">
          <Textarea
            placeholder="Paste phone numbers separated by comma, space, or newline...&#10;e.g. 08012345678, 09098765432, 2348123456789"
            value={rawText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="bg-background border-border text-xs min-h-[90px] font-mono leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Supports local Nigerian numbers (<code>080...</code>), international format (<code>234...</code>), and optional names.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-file-input"
          />
          <label
            htmlFor="csv-file-input"
            className="border-2 border-dashed border-border/80 hover:border-secondary/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-background/50 hover:bg-muted/30 transition-all text-center space-y-1.5"
          >
            <Upload className="w-5 h-5 text-secondary mb-0.5" />
            <div className="text-xs font-bold text-foreground">
              {fileName ? fileName : "Click to select a CSV or TXT file"}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Columns for "Phone" or "Mobile" and "Name" are automatically detected.
            </p>
          </label>
        </div>
      )}

      {/* Import Metrics & Feedback Strip */}
      {result && result.totalParsed > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 bg-chart-green/10 text-chart-green border border-chart-green/20 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
              <CheckCircle2 className="w-3 h-3" />
              {result.validRecipients.length} Valid {result.validRecipients.length === 1 ? "Number" : "Numbers"}
            </span>

            {result.duplicateCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-mono font-medium">
                {result.duplicateCount} Duplicates Skipped
              </span>
            )}

            {result.invalidCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded text-[11px] font-mono font-medium">
                {result.invalidCount} Invalid Skipped
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
};
