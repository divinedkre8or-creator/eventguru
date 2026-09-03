import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquarePlus, CheckCircle2, Circle, Loader2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FeedbackList = () => {
  const [filter, setFilter] = useState("all");

  const { data: feedbacks = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = feedbacks.filter((f: any) => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase.from as any)("feedback").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      toast.success("Feedback status updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback permanently?")) return;
    try {
      const { error } = await (supabase.from as any)("feedback").delete().eq("id", id);
      if (error) throw error;
      toast.success("Feedback deleted");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete feedback");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "text-chart-orange bg-chart-orange/10 border-chart-orange/20",
    reviewed: "text-chart-blue bg-chart-blue/10 border-chart-blue/20",
    resolved: "text-chart-green bg-chart-green/10 border-chart-green/20",
  };

  const typeIcons: Record<string, string> = {
    bug: "🐛",
    suggestion: "💡",
    complaint: "⚠️",
    support: "👋",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      <div className="border-b border-border pb-4">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider bg-muted px-2.5 py-1 rounded inline-block mb-2 text-foreground">
          ADMIN INBOX
        </div>
        <h1 className="font-heading text-3xl font-black text-foreground tracking-tight">Feedback & Support Inbox</h1>
        <p className="text-muted-foreground text-xs font-medium mt-1">Review feedback, complaints, and feature suggestions from organizers.</p>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        {["all", "pending", "reviewed", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors border ${
              filter === s 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs font-mono">Loading feedback items...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-lg space-y-3">
          <MessageSquarePlus className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h3 className="font-heading text-lg font-bold text-foreground">No feedback found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">It looks quite empty here right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <div key={item.id} className="bg-card rounded-lg border border-border p-5 flex flex-col sm:flex-row gap-4 shadow-xs">
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcons[item.type] || "📝"}</span>
                    <span className="font-bold text-foreground text-sm capitalize">{item.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${statusColors[item.status] || "text-muted-foreground bg-muted border-border"}`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/40 p-4 border border-border">
                  {item.message}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {item.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">{item.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail className="w-3 h-3" /> {item.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4 justify-center">
                {item.status !== "pending" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "pending")} className="h-8 text-xs font-bold text-chart-orange hover:bg-chart-orange/10 justify-start w-full">
                     <Circle className="w-3.5 h-3.5 mr-2" /> Mark Pending
                   </Button>
                )}
                {item.status !== "reviewed" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "reviewed")} className="h-8 text-xs font-bold text-chart-blue hover:bg-chart-blue/10 justify-start w-full">
                     <Circle className="w-3.5 h-3.5 mr-2" /> Mark Reviewed
                   </Button>
                )}
                {item.status !== "resolved" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "resolved")} className="h-8 text-xs font-bold text-chart-green hover:bg-chart-green/10 justify-start w-full">
                     <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Mark Resolved
                   </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => deleteFeedback(item.id)} className="h-8 mt-auto text-xs font-bold text-destructive hover:bg-destructive/10 justify-start w-full">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
