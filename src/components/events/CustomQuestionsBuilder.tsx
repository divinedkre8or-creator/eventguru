import React, { useState } from "react";
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Copy, GripVertical, 
  HelpCircle, CheckSquare, ListFilter, AlignLeft, Type, Bookmark 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  CustomQuestion, 
  CustomQuestionType 
} from "@/lib/eventMetadata";

interface CustomQuestionsBuilderProps {
  questions: CustomQuestion[];
  onChange: (questions: CustomQuestion[]) => void;
}

const QUESTION_TYPES: Array<{
  type: CustomQuestionType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  { type: "text", label: "Short Answer", icon: Type, description: "Single line text response" },
  { type: "textarea", label: "Paragraph", icon: AlignLeft, description: "Longer text response" },
  { type: "radio", label: "Multiple Choice", icon: CheckSquare, description: "Select one option from a list" },
  { type: "dropdown", label: "Dropdown", icon: ListFilter, description: "Select one from a dropdown menu" },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare, description: "Select one or more options" },
];

const PRESET_TEMPLATES: Array<{
  label: string;
  question: Omit<CustomQuestion, "id">;
}> = [
  {
    label: "Who invited you?",
    question: {
      prompt: "Who invited you to this event?",
      type: "text",
      options: [],
      required: false,
      placeholder: "e.g. Name of friend or host",
    },
  },
  {
    label: "Where did you hear about us?",
    question: {
      prompt: "How did you hear about this event?",
      type: "dropdown",
      options: ["Social Media (Twitter/X, Instagram, LinkedIn)", "WhatsApp Group / Status", "Friend or Colleague", "Search Engine", "Other"],
      required: false,
    },
  },
  {
    label: "Company / Organization",
    question: {
      prompt: "What is your Company or Organization name?",
      type: "text",
      options: [],
      required: false,
      placeholder: "e.g. Acme Corp",
    },
  },
  {
    label: "Job Title",
    question: {
      prompt: "What is your current Job Title / Role?",
      type: "text",
      options: [],
      required: false,
      placeholder: "e.g. Software Engineer / Product Designer",
    },
  },
  {
    label: "Dietary Preferences",
    question: {
      prompt: "Do you have any dietary preferences or allergies?",
      type: "checkbox",
      options: ["None", "Vegetarian", "Vegan", "Halal", "Gluten-Free", "Nut Allergy"],
      required: false,
    },
  },
];

export const CustomQuestionsBuilder: React.FC<CustomQuestionsBuilderProps> = ({
  questions,
  onChange,
}) => {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const generateId = () => `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const addQuestion = (template?: Omit<CustomQuestion, "id">) => {
    const newQuestion: CustomQuestion = template
      ? { ...template, id: generateId() }
      : {
          id: generateId(),
          prompt: "",
          type: "text",
          options: ["Option 1", "Option 2"],
          required: false,
        };

    const updated = [...questions, newQuestion];
    onChange(updated);
    setActiveQuestionId(newQuestion.id);
  };

  const updateQuestion = (id: string, updates: Partial<CustomQuestion>) => {
    const updated = questions.map((q) => (q.id === id ? { ...q, ...updates } : q));
    onChange(updated);
  };

  const removeQuestion = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    onChange(updated);
    if (activeQuestionId === id) setActiveQuestionId(null);
  };

  const duplicateQuestion = (index: number) => {
    const target = questions[index];
    if (!target) return;
    const duplicated: CustomQuestion = {
      ...target,
      id: generateId(),
      prompt: `${target.prompt} (Copy)`,
      options: [...target.options],
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    onChange(updated);
    setActiveQuestionId(duplicated.id);
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  // Option management for choice questions
  const addOption = (questionId: string) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;
    const newOptionNumber = target.options.length + 1;
    const updatedOptions = [...target.options, `Option ${newOptionNumber}`];
    updateQuestion(questionId, { options: updatedOptions });
  };

  const updateOption = (questionId: string, optIndex: number, value: string) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;
    const updatedOptions = [...target.options];
    updatedOptions[optIndex] = value;
    updateQuestion(questionId, { options: updatedOptions });
  };

  const removeOption = (questionId: string, optIndex: number) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target || target.options.length <= 1) return;
    const updatedOptions = target.options.filter((_, idx) => idx !== optIndex);
    updateQuestion(questionId, { options: updatedOptions });
  };

  const isChoiceType = (type: CustomQuestionType) => ["radio", "dropdown", "checkbox"].includes(type);

  return (
    <div className="space-y-4 w-full min-w-0 font-sans">
      {/* Header and Quick Presets */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-bold text-foreground">
                Custom Attendee Questions
              </h3>
              <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">
                {questions.length} Question{questions.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Collect custom responses (e.g. referral sources, dietary preferences, or company names) from attendees during checkout.
            </p>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Bookmark className="w-3.5 h-3.5 text-secondary" />
            <span>Click to add popular questions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPLATES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => addQuestion(preset.question)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 transition-colors text-foreground flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3 h-3 text-secondary" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-xl bg-background/50 space-y-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h4 className="font-heading text-sm font-bold text-foreground">No custom questions added yet</h4>
            <p className="text-xs text-muted-foreground">
              By default, attendees only provide Full Name, Email, and Phone number. Add custom questions if you need additional details.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => addQuestion()}
            variant="outline"
            className="border-dashed font-heading font-bold text-xs h-9 px-4 text-foreground"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-secondary" /> Create First Question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const hasOptions = isChoiceType(question.type);

            return (
              <div
                key={question.id}
                className="bg-card rounded-xl border border-border p-4 sm:p-5 space-y-4 transition-all hover:border-primary/40 shadow-xs relative"
              >
                {/* Top Action Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground font-mono text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-heading text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {QUESTION_TYPES.find((t) => t.type === question.type)?.label || "Question"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, index - 1)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, index + 1)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateQuestion(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Duplicate Question"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(question.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Question Prompt & Type Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Question Title / Prompt *</Label>
                    <Input
                      value={question.prompt}
                      onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                      placeholder="e.g. Who invited you to this event?"
                      className="bg-background border-border text-xs h-10 rounded-lg text-foreground font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Answer Type</Label>
                    <select
                      value={question.type}
                      onChange={(e) => {
                        const newType = e.target.value as CustomQuestionType;
                        const updates: Partial<CustomQuestion> = { type: newType };
                        if (["radio", "dropdown", "checkbox"].includes(newType) && question.options.length === 0) {
                          updates.options = ["Option 1", "Option 2"];
                        }
                        updateQuestion(question.id, updates);
                      }}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs text-foreground font-bold focus:ring-2 focus:ring-primary outline-none"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Options List (for Multiple Choice / Dropdown / Checkboxes) */}
                {hasOptions && (
                  <div className="bg-background/80 rounded-xl border border-border p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Selectable Options ({question.options.length})
                      </Label>
                      <button
                        type="button"
                        onClick={() => addOption(question.id)}
                        className="text-[11px] font-bold text-secondary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Choice
                      </button>
                    </div>

                    <div className="space-y-2">
                      {question.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-4 text-center">
                            {optIndex + 1}.
                          </span>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                            placeholder={`Choice ${optIndex + 1}`}
                            className="bg-card border-border text-xs h-8 rounded-lg flex-1"
                          />
                          {question.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(question.id, optIndex)}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove option"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Settings Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`req_${question.id}`}
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                    />
                    <Label htmlFor={`req_${question.id}`} className="text-xs font-bold text-foreground cursor-pointer">
                      Mandatory / Required to answer
                    </Label>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {question.required ? "Attendee must answer" : "Optional for attendee"}
                  </span>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            onClick={() => addQuestion()}
            variant="outline"
            className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2 text-xs font-heading font-bold"
          >
            <Plus className="w-4 h-4 text-secondary" /> Add Another Question
          </Button>
        </div>
      )}
    </div>
  );
};
