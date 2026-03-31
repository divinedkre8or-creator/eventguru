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

  const filtered = feedbacks.filter((f) => {
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
    pending: "text-amber bg-amber/10 border-amber/20",
    reviewed: "text-electric bg-electric/10 border-electric/20",
    resolved: "text-teal bg-teal/10 border-teal/20",
  };

  const typeIcons: Record<string, string> = {
    bug: "🐛",
    suggestion: "💡",
    complaint: "⚠️",
    support: "👋",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-800 text-ivory">Feedback & Support Inbox</h1>
          <p className="text-ivory/60 text-sm font-body mt-1">Review feedback, complaints, and feature suggestions from organizers.</p>
        </div>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        {["all", "pending", "reviewed", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-heading font-700 capitalize whitespace-nowrap transition-colors ${
              filter === s ? "bg-coral text-ink" : "bg-white/5 border border-white/10 text-ivory/60 hover:text-ivory"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-coral" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/5 rounded-xl">
          <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 text-ivory/20" />
          <h3 className="font-heading text-lg font-700 text-ivory mb-1">No feedback found</h3>
          <p className="text-ivory/60 text-sm font-body">It looks quite empty here right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white/5 rounded-xl border border-white/10 p-5 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcons[item.type] || "📝"}</span>
                    <span className="font-heading font-800 text-ivory text-base capitalize">{item.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-heading font-800 border ${statusColors[item.status] || "text-ivory bg-white/5 border-white/10"}`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="text-xs text-ivory/40 font-body shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-ivory/80 text-sm font-body leading-relaxed whitespace-pre-wrap rounded-lg bg-black/20 p-4 border border-white/5">
                  {item.message}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <div className="w-8 h-8 rounded-full bg-coral/20 flex items-center justify-center text-coral font-heading font-800 text-xs">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-heading font-700 text-sm text-ivory">{item.name}</div>
                    <div className="flex items-center gap-1 text-xs text-ivory/60">
                      <Mail className="w-3 h-3" /> {item.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4">
                {item.status !== "pending" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "pending")} className="h-8 text-xs font-heading font-700 text-amber hover:bg-amber/10 justify-start w-full">
                     <Circle className="w-3 h-3 mr-2" /> Mark Pending
                   </Button>
                )}
                {item.status !== "reviewed" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "reviewed")} className="h-8 text-xs font-heading font-700 text-electric hover:bg-electric/10 justify-start w-full">
                     <Circle className="w-3 h-3 mr-2" /> Mark Reviewed
                   </Button>
                )}
                {item.status !== "resolved" && (
                   <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "resolved")} className="h-8 text-xs font-heading font-700 text-teal hover:bg-teal/10 justify-start w-full">
                     <CheckCircle2 className="w-3 h-3 mr-2" /> Mark Resolved
                   </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => deleteFeedback(item.id)} className="h-8 mt-auto text-xs font-heading font-700 text-coral hover:bg-coral/10 justify-start w-full">
                  <Trash2 className="w-3 h-3 mr-2" /> Delete
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
